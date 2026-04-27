/**
 * BundleRow — Framer-style "compound property" chip + floating panel.
 *
 * Chip in the section: icon + label + X. Clicking opens a `FloatingPanel`
 * (the canonical drag/resize/viewport-clamped primitive) docked to the side
 * opposite the sidebar. Panel renders the bundle's child PropertyDefs.
 *
 * X on the chip clears every child tag. Auto-opens when added via +Add picker.
 */
import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useNode } from "@craftjs/core";
import { useAtomValue, useAtomState } from "@zedux/react";
import {
  classPropKeyMatches,
  splitClassVariants,
} from "../../../../utils/tailwind/className";
import { TRANSPARENT_CHECKER_BG } from "../../../../utils/design/colorSystem";
import { SideBarAtom } from "../../../../utils/lib";
import { PopoverChip } from "../../../primitives/PopoverChip";
import { SessionAddedAtom, sessionKey } from "../../unified-settings/sessionAddedAtom";
import type { PropertyDef, PropertyInputProps } from "../../unified-settings/registry/propertyDefs";

// Lazy: panel body imports FloatingPanel + PropertyRenderer (huge transitive
// graph). Keeping them out of the BundleRow module means HMR edits to either
// won't ripple through every BundleRow mounted in the toolbar.
const BundleRowPanel = lazy(() => import("./BundleRowPanel"));

interface Props extends PropertyInputProps {
  properties: PropertyDef[];
  icon?: React.ReactNode;
}

// Approx row height in the panel body (input row + gap). Used to size the
// panel to fit its content when first opened.
const ROW_HEIGHT = 40;
const PANEL_HEADER = 32;
const PANEL_PAD = 24;
const PANEL_WIDTH = 300;

export function BundleRow({ def, properties, icon }: Props) {
  const [open, setOpen] = useState(false);
  const [initialPos, setInitialPos] = useState<{ x: number; y: number } | undefined>();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [sessionAdded, setSessionAdded] = useAtomState(SessionAddedAtom);
  // Sidebar docked left → panel opens on the RIGHT side of the trigger.
  // Docked right → opens to the LEFT side. Either way: adjacent to the chip.
  const sidebarLeft = useAtomValue(SideBarAtom);

  const {
    actions: { setProp },
    id,
    className,
  } = useNode((node: any) => ({
    nodeId: node.id,
    className: typeof node.data?.props?.className === "string" ? node.data.props.className : "",
  }));

  // Detect a color child + its current swatch class for the chip preview.
  // For ring-N color → render `bg-N` (e.g. ring-primary → bg-primary).
  const colorChild = properties.find(c => c.input.type === "color") as
    | (PropertyDef & { input: { type: "color"; prefix: string } })
    | undefined;
  const colorChildKey = colorChild ? colorChild.propKey || colorChild.id : null;
  const swatchBgClass = (() => {
    if (!colorChild || !colorChildKey) return null;
    for (const tok of (className || "").trim().split(/\s+/)) {
      if (!tok) continue;
      const { base } = splitClassVariants(tok);
      if (!classPropKeyMatches(base, colorChildKey)) continue;
      const suffix = base.startsWith(`${colorChild.input.prefix}-`)
        ? base.slice(colorChild.input.prefix.length + 1)
        : "";
      if (suffix) return `bg-${suffix}`;
    }
    return null;
  })();

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

  // Auto-open on first mount if just added via +Add picker.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (sessionAdded.has(sessionKey(id, def.id))) {
      // Defer to next tick so the trigger ref is mounted and getBoundingClientRect resolves.
      requestAnimationFrame(() => {
        setInitialPos(computePosition());
        setOpen(true);
      });
      autoOpenedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionAdded, id, def.id]);

  const remove = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    // Strip ALL classes the bundle owns across EVERY scope (mobile, sm:, md:,
    // dark:, hover:, ...). removeClassForView is scoped to a single view, so
    // it'd leave bare classes when the toolbar is in the desktop scope.
    const ownedKeys = properties
      .filter(child => (child.propType || "class") === "class")
      .map(child => child.propKey || child.id);
    setProp((p: any) => {
      const cn = typeof p.className === "string" ? p.className : "";
      p.className = cn
        .trim()
        .split(/\s+/)
        .filter(cls => {
          if (!cls) return false;
          const { base } = splitClassVariants(cls);
          return !ownedKeys.some(k => classPropKeyMatches(base, k));
        })
        .join(" ");
      for (const child of properties) {
        if ((child.propType || "class") !== "class") {
          delete p[child.propKey || child.id];
        }
      }
      if (Array.isArray(p.toolbarOrder)) {
        p.toolbarOrder = p.toolbarOrder.filter((x: string) => x !== def.id);
      }
    }, 0);
    const next = new Set(sessionAdded);
    next.delete(sessionKey(id, def.id));
    setSessionAdded(next);
    setOpen(false);
  };

  const leading = colorChild ? (
    <span
      className="border-base-300 relative size-4 shrink-0 overflow-hidden rounded border"
      style={swatchBgClass ? undefined : TRANSPARENT_CHECKER_BG}
      aria-hidden
    >
      {swatchBgClass && <span className={`absolute inset-0 ${swatchBgClass}`} aria-hidden />}
    </span>
  ) : icon ? (
    icon
  ) : null;

  return (
    <div className="flex items-center gap-0.5">
      <span className="text-base-content w-20 shrink-0 truncate text-xs">{def.label}</span>
      <PopoverChip
        ref={triggerRef}
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={remove}
        triggerAriaLabel={`Edit ${def.label}`}
        clearAriaLabel={`Remove ${def.label}`}
        leading={leading}
        summary="Add..."
      />
      {open && (
        <Suspense fallback={null}>
          <BundleRowPanel
            title={def.label}
            icon={icon}
            storageKey={`bundle-${def.id}`}
            defaultWidth={PANEL_WIDTH}
            defaultHeight={PANEL_HEADER + PANEL_PAD + properties.length * ROW_HEIGHT}
            initialPosition={initialPos}
            onClose={() => setOpen(false)}
            properties={properties}
          />
        </Suspense>
      )}
    </div>
  );
}
