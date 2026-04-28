/**
 * IconInput — Framer-style chip + floating popover for component-prop icon stacks.
 *
 * Replaces the 5–7 inline rows that used to live in Button/Link/ButtonList/Nav
 * Content sections. Renders one row: live icon thumb + label + X clear. Click
 * opens a `FloatingPanel` containing every icon control:
 *   • Image (IconDialogInput) · Only Show Icon · Position · Size
 *   • Color · Shadow · Gap
 *
 * Operates on component props (`icon.value`, `icon.only`, etc.) — the registry
 * `BundleRow` reads className-based class props, so this is a parallel
 * implementation using the same FloatingPanel + chip visuals.
 */
import React, { useRef, useState } from "react";
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { TailwindStyles } from "@/utils/tailwind";
import { InlineClearButton } from "@/chrome/primitives/InlineClearButton";
import { ToolbarRowFrame } from "@/chrome/primitives/ToolbarRowFrame";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { SideBarAtom } from "../../../../utils/lib";
import { parseIconRef } from "@/utils/icons/collectIconRefs";
import ClientIconLoader from "../../dialogs/ClientIconLoader";
import { ToolbarItem } from "../../ToolbarItem";
import { ColorInput } from "../color/ColorInput";
import { ShadowInput } from "../color/ShadowInput";
import { IconDialogInput } from "./IconDialogInput";

interface IconInputProps {
  /** Root prop key under which icon.* fields live (default "icon"). */
  propKey?: string;
  /** Always "component" for icon stacks — kept for API compatibility. */
  propType?: string;
  /** Chip label (default "Icon"). */
  label?: string;
  /** Show the "Only Show Icon" toggle in the popover. */
  showIconOnly?: boolean;
  /** Show the Position select in the popover. */
  showPosition?: boolean;
  iconOnlyLabel?: string;
  positionLabel?: string;
  // Legacy props kept so existing callers don't break — no longer affect layout.
  labelWidth?: string;
  inputWidth?: string;
  collapsible?: boolean;
}

// Hint width for chip-anchored initial position only — panel is auto-sized.
const PANEL_WIDTH = 320;

/** "ref-icon:tb/TbCircleCheck" → "Circle Check"; "ref-image:abc" → "Custom"; else raw. */
function humanizeIconValue(value: string): string {
  if (value.startsWith("ref-image:")) return "Custom";
  const parsed = parseIconRef(value);
  if (!parsed) return value;
  const setPrefix = parsed.set.charAt(0).toUpperCase() + parsed.set.slice(1);
  const stripped = parsed.name.startsWith(setPrefix)
    ? parsed.name.slice(setPrefix.length)
    : parsed.name;
  return stripped.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}

/** Walk a dot path (e.g. "icon.value") through a props object. */
function readNested(props: Record<string, any>, dotPath: string): unknown {
  const keys = dotPath.split(".");
  let v: any = props;
  for (const k of keys) {
    v = v?.[k];
    if (v === undefined) return undefined;
  }
  return v;
}

export const IconInput = ({
  propKey = "icon",
  propType = "component",
  label = "Icon",
  showIconOnly = true,
  showPosition = true,
  iconOnlyLabel = "Only Show Icon",
  positionLabel = "Position",
}: IconInputProps) => {
  const [open, setOpen] = useState(false);
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | undefined>();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const sidebarLeft = useAtomValue(SideBarAtom);

  const {
    actions: { setProp },
    iconValue,
  } = useNode((node: any) => ({
    iconValue:
      typeof readNested(node.data?.props || {}, `${propKey}.value`) === "string"
        ? (readNested(node.data?.props || {}, `${propKey}.value`) as string)
        : "",
  }));

  const computePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return undefined;
    const x = sidebarLeft ? rect.right + 8 : rect.left - PANEL_WIDTH - 8;
    return { x: Math.max(8, x), y: Math.max(8, rect.top) };
  };

  const openPanel = () => {
    setInitialPos(computePosition());
    setOpen(true);
  };

  /** Clear the entire icon stack — value, position, only, color, shadow, gap, size. */
  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProp((p: any) => {
      delete p[propKey];
    }, 0);
  };

  return (
    <div className="flex items-center gap-0.5">
      <span className="text-base-content w-20 shrink-0 truncate text-xs">{label}</span>
      <ToolbarRowFrame
        open={open}
        trailing={
          iconValue ? (
            <InlineClearButton onClick={clearAll} tooltip="Remove icon" />
          ) : null
        }
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (open ? setOpen(false) : openPanel())}
          aria-expanded={open}
          aria-label={iconValue ? `Edit icon: ${iconValue}` : "Add icon"}
          className="flex h-full min-w-0 flex-1 items-center gap-1.5 truncate px-1 text-left"
        >
          <span
            className={`flex size-4 shrink-0 items-center justify-center ${
              iconValue
                ? "text-base-content"
                : "border-base-300 text-neutral-content/60 rounded-sm border border-dashed"
            }`}
            aria-hidden
          >
            {iconValue ? <ClientIconLoader value={iconValue} /> : null}
          </span>
          <span className="text-neutral-content flex-1 truncate">
            {iconValue ? humanizeIconValue(iconValue) : "Add..."}
          </span>
        </button>
      </ToolbarRowFrame>
      {open && (
        <FloatingPanel
          isOpen
          onClose={() => setOpen(false)}
          title={label}
          storageKey={`icon-bundle-${propKey}`}
          minWidth={280}
          maxWidth={480}
          minHeight={200}
          initialPosition={initialPos}
          zIndex={1100}
        >
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
            <IconDialogInput
              propKey={`${propKey}.value`}
              propType={propType}
              label="Image"
              labelWidth="w-full"
              inputWidth="w-fit"
            />

            {showIconOnly && (
              <ToolbarItem
                propKey={`${propKey}.only`}
                propType={propType}
                type="checkbox"
                label={iconOnlyLabel}
                on={true}
                labelHide
                labelWidth="w-full"
              />
            )}

            {showPosition && (
              <ToolbarItem
                propKey={`${propKey}.position`}
                propType={propType}
                type="select"
                label={positionLabel}
                inline
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
              </ToolbarItem>
            )}

            <ToolbarItem
              propKey={`${propKey}.size`}
              propType={propType}
              type="select"
              label="Size"
              max={TailwindStyles.allWidths.length - 1}
              min={0}
              valueLabels={TailwindStyles.allWidths}
              inline
            />

            <ColorInput
              propKey={`${propKey}.color`}
              propType={propType}
              label="Color"
              prefix="text"
              inline
            />

            <ShadowInput propKey={`${propKey}.shadow`} propType={propType} />

            <ToolbarItem
              propKey={`${propKey}.gap`}
              propType={propType}
              type="select"
              label="Gap"
              max={TailwindStyles.gap.length - 1}
              min={0}
              valueLabels={TailwindStyles.gap}
              inline
            />
          </div>
        </FloatingPanel>
      )}
    </div>
  );
};

export default IconInput;
