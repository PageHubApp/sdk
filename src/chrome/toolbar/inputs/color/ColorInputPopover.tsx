/**
 * ColorInputPopover — popover-mode trigger chip for sidebar color properties.
 *
 * Replaces the `ColorInput` swatch row used by PropertyRenderer's
 * `case "color":` branch. The chip shows the current color via Chip's
 * preview variant (full-bleed swatch fill), and opens a draggable
 * FloatingPanel containing ColorPanelBody (HSV picker + palette + recent +
 * tailwind grids).
 *
 * Other callsites of `ColorInput` (inline TipTap, top-of-canvas text tool,
 * Gradient stop rows, Pattern body, Icon color, Button color, Divider) keep
 * the swatch behavior — they import `ColorInput` directly.
 */
import { useEditor, useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { Chip } from "@/chrome/primitives/Chip";
import { usePopoverPosition } from "../../inspector/hooks/usePopoverPosition";
import {
  cssColorShowsTransparency,
  formatColorForStorage,
  parseColorValue,
  resolveColorForDisplay,
  resolvePaletteReference,
  TRANSPARENT_CHECKER_BG,
} from "../../../../utils/design/colorSystem";
import { editorCanvasViewToClassPrefixKey } from "../../../../utils/tailwind/className";
import { resolveTheme } from "../../../../utils/design/resolveTheme";
import { ROOT_NODE } from "@craftjs/utils";
import { changeProp, getPropFinalValue } from "../../../viewport/state/viewportExports";
import { ViewAtom } from "../../../viewport/state/atoms";
import { ViewSelectionAtom } from "../../Label";

const ColorPanel = lazy(() => import("./ColorPanel"));

const PANEL_WIDTH = 280;
const PANEL_HEIGHT = 540;

interface ColorInputPopoverProps {
  propKey: string;
  label?: string;
  prefix?: string;
  index?: any;
  propItemKey?: string;
  propType?: string;
  onChange?: (cpVal: string, val: string) => void;
  labelHide?: boolean;
  inline?: boolean;
  inputWidth?: string;
  labelWidth?: string;
}

export function ColorInputPopover(__props: ColorInputPopoverProps) {
  const {
    propKey,
    label = "",
    prefix = "",
    index = null,
    propItemKey = "",
    propType = "class",
    onChange = () => {},
    labelHide = false,
    inline = false,
    inputWidth = "",
    labelWidth = "",
  } = __props;

  const [open, setOpen] = useState(false);
  const { triggerRef, initialPos, setInitialPos, computePosition } =
    usePopoverPosition(PANEL_WIDTH);

  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const { actions, query } = useEditor();

  const {
    actions: { setProp },
    nodeProps,
    id,
  } = useNode(node => ({
    nodeProps: node.data?.props || {},
    id: node.id,
  }));

  const { value: resolved } = getPropFinalValue(__props, view, nodeProps, classDark);
  const value: string = resolved || "";

  const palette = useMemo(() => {
    try {
      const rootNode = query.node(ROOT_NODE).get();
      return resolveTheme(rootNode?.data?.props || {}).palette;
    } catch {
      return [];
    }
  }, [query]);

  const displayValue = resolvePaletteReference(value, prefix);
  const [, cpVal] = parseColorValue(displayValue, prefix);
  const finalStyle = resolveColorForDisplay(displayValue, prefix, palette);
  const hasStoredColor = Boolean(String(value ?? "").trim());
  const fillCss = finalStyle.backgroundColor ?? "";
  const showChecker = !hasStoredColor || cssColorShowsTransparency(fillCss);

  const classWriteView = propType === "class" ? editorCanvasViewToClassPrefixKey(view) : undefined;

  const writeColor = useCallback(
    (val: string) => {
      changeProp({
        propKey,
        index,
        propItemKey,
        propType,
        value: val,
        setProp,
        query,
        actions,
        nodeId: id,
        ...(propType === "class" && classWriteView != null
          ? { view: classWriteView, classDark }
          : {}),
      });
      onChange(cpVal, val);
    },
    [
      actions,
      classDark,
      classWriteView,
      cpVal,
      id,
      index,
      onChange,
      propItemKey,
      propKey,
      propType,
      query,
      setProp,
    ]
  );

  const handlePanelChange = useCallback(
    (data: { type: "palette" | "hex" | "rgb" | "class"; value: any }) => {
      if (!data) return;
      const val = formatColorForStorage(data, prefix);
      writeColor(val);
    },
    [prefix, writeColor]
  );

  const clearColor = useCallback(() => {
    writeColor("");
  }, [writeColor]);

  const openPanel = () => {
    setInitialPos(computePosition());
    setOpen(true);
  };

  let viewValue: string | number = view;
  if (propType === "component" || propType === "root") {
    viewValue = "component";
  } else if (index) {
    viewValue = typeof index === "number" ? index : String(index);
  }

  const summary = hasStoredColor ? cpVal || "Color" : "Pick color";

  return (
    <>
      <Chip
        mode="popover"
        ref={triggerRef}
        label={labelHide ? undefined : label}
        index={index}
        propType={propType}
        propKey={propKey}
        propItemKey={propItemKey}
        labelWidth={labelWidth}
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={() => {
          if (open) setOpen(false);
          clearColor();
        }}
        triggerAriaLabel={hasStoredColor ? "Edit color" : "Pick color"}
        clearAriaLabel="Clear color"
        variant={hasStoredColor ? "preview" : "default"}
        leading={
          hasStoredColor ? (
            <>
              {showChecker && (
                <span
                  className="pointer-events-none absolute inset-0 z-0"
                  style={TRANSPARENT_CHECKER_BG}
                  aria-hidden
                />
              )}
              <span
                className="pointer-events-none absolute inset-0 z-[1]"
                style={{ backgroundColor: fillCss }}
                aria-hidden
              />
            </>
          ) : (
            <span
              className="block size-3.5 rounded-sm border"
              style={{
                backgroundColor: "transparent",
                ...TRANSPARENT_CHECKER_BG,
                borderColor: "var(--base-300)",
              }}
              aria-hidden
            />
          )
        }
        summary={hasStoredColor ? null : summary}
      />
      {open && (
        <Suspense fallback={null}>
          <ColorPanel
            initialPosition={initialPos}
            onClose={() => setOpen(false)}
            defaultWidth={PANEL_WIDTH}
            defaultHeight={PANEL_HEIGHT}
            value={value}
            onChange={handlePanelChange}
            onClear={clearColor}
          />
        </Suspense>
      )}
    </>
  );
}
