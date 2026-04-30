/**
 * VarPicker — FloatingPanel that lists every design token (palette +
 * typography + styleGuide built-ins + custom tokens) and lets the user pick,
 * create, or edit one.
 *
 * Three stages in a single panel: `list` → `edit` / `create` → `list`. The
 * orchestrator owns the stage state and renders the appropriate body
 * component. FloatingPanel chrome stays mounted across stage transitions so
 * the panel doesn't re-position / re-mount mid-flow.
 */
import React, { useState } from "react";
import { TbBraces } from "react-icons/tb";
import { FloatingPanel } from "../../../../floating/FloatingPanel";
import { DesignVar } from "../types";
import { useDesignVars } from "../hooks/useDesignVars";
import { VarList } from "./VarList";
import { VarEditor } from "./VarEditor";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../../overlays/overlayZIndex";

export interface VarPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Element the picker anchors to — typically the type-selector chip. When
   *  omitted (e.g. opened from StylesTab), the panel centers via FloatingPanel. */
  anchor?: React.RefObject<HTMLElement>;
  /** Additional DOM nodes treated as "inside" by FloatingPanel's
   *  outside-click dismiss. */
  ignoreOutsideClicks?: ReadonlyArray<React.RefObject<HTMLElement | null>>;
  /** Called when the user picks a var from the list. The argument is the
   *  fully-formed value ready to write to a className (e.g. `var(--primary)`
   *  or `font-(--heading-font-family)`). */
  onSelect?: (value: string) => void;
  /** Currently-selected value on the consuming property (used to highlight the
   *  matching row in the list). */
  currentValue?: string;
  /** Property tag of the consuming input — used to filter the list down to
   *  relevant categories. Omit to show every category. */
  propTag?: string;
  /** Tailwind key of the consuming input — more specific than propTag for
   *  filtering (e.g. `fontSize` vs `textColor`). Omit to disable filtering. */
  tailwindKey?: string;
}

const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 480;

const TYPOGRAPHY_KEYS = new Set([
  "fontSize",
  "fontWeight",
  "fontFamily",
  "lineHeight",
  "tracking",
  "letterSpacing",
  "indent",
]);

const COLOR_KEYS = new Set([
  "textColor",
  "backgroundColor",
  "borderColor",
  "ringColor",
  "ringOffsetColor",
  "outlineColor",
  "divideColor",
  "fill",
  "stroke",
  "accentColor",
  "caretColor",
]);

const SPACING_KEYS = new Set([
  "padding",
  "margin",
  "gap",
  "gapX",
  "gapY",
  "spaceX",
  "spaceY",
  "width",
  "height",
  "maxWidth",
  "maxHeight",
  "minWidth",
  "minHeight",
  "inset",
  "top",
  "right",
  "bottom",
  "left",
  "translate",
  "translateX",
  "translateY",
]);

const SPACING_PROP_TAGS = new Set([
  "w",
  "h",
  "m",
  "p",
  "mt",
  "mb",
  "ml",
  "mr",
  "mx",
  "my",
  "pt",
  "pb",
  "pl",
  "pr",
  "px",
  "py",
  "gap",
]);

function getRelevantCategories(propTag?: string, tailwindKey?: string): string[] | null {
  if (tailwindKey && TYPOGRAPHY_KEYS.has(tailwindKey)) return ["typography"];
  if (tailwindKey && COLOR_KEYS.has(tailwindKey)) return ["palette", "colors"];
  if (tailwindKey && SPACING_KEYS.has(tailwindKey)) return ["spacing", "other"];
  if (propTag && SPACING_PROP_TAGS.has(propTag)) return ["spacing", "other"];
  if (propTag && (propTag === "bg" || propTag === "border")) return ["palette", "colors"];
  if (propTag === "font") return ["typography"];
  // No filter → show every category (used by the "Manage Tokens" entry point).
  return null;
}

type Stage = { mode: "list" } | { mode: "edit"; token: DesignVar } | { mode: "create" };

export function VarPicker({
  open,
  onOpenChange,
  anchor,
  ignoreOutsideClicks,
  onSelect,
  currentValue,
  propTag,
  tailwindKey,
}: VarPickerProps) {
  const [stage, setStage] = useState<Stage>({ mode: "list" });
  const designVars = useDesignVars();

  // Position is computed once per mount via useState lazy init from the
  // anchor's bounding rect. The parent should conditionally render this
  // component (don't pass `open=false` to a mounted VarPicker) so each open
  // is a fresh mount → fresh position. FloatingPanel uses useState for its
  // drag position and ignores prop changes after mount, so we MUST compute
  // synchronously before passing it down.
  const [initialPosition] = useState<{ x: number; y: number } | undefined>(() => {
    const rect = anchor?.current?.getBoundingClientRect();
    if (!rect) return undefined;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const wantsRight = rect.right + 8 + PANEL_WIDTH <= vw;
    const x = wantsRight ? rect.right + 8 : Math.max(8, rect.left - PANEL_WIDTH - 8);
    const y = Math.max(8, rect.top);
    return { x, y };
  });

  if (!open) return null;

  const relevantCategories = getRelevantCategories(propTag, tailwindKey);

  const headerTitle =
    stage.mode === "list"
      ? "Design Variables"
      : stage.mode === "create"
        ? "New Token"
        : "Edit Token";

  return (
    <FloatingPanel
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={headerTitle}
      icon={<TbBraces className="size-3.5" aria-hidden />}
      storageKey="universal-input-var-picker"
      defaultWidth={PANEL_WIDTH}
      defaultHeight={PANEL_HEIGHT}
      minWidth={300}
      maxWidth={520}
      minHeight={280}
      maxHeight={680}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      autoSize={false}
      persistSize={false}
      scrollable={false}
      ignoreOutsideClicks={ignoreOutsideClicks}
    >
      {stage.mode === "list" ? (
        <VarList
          designVars={designVars}
          relevantCategories={relevantCategories}
          tailwindKey={tailwindKey}
          currentValue={currentValue}
          onSelect={value => {
            onSelect?.(value);
            onOpenChange(false);
          }}
          onEdit={token => setStage({ mode: "edit", token })}
          onCreate={() => setStage({ mode: "create" })}
        />
      ) : (
        <VarEditor
          mode={stage.mode}
          token={stage.mode === "edit" ? stage.token : undefined}
          onBack={() => setStage({ mode: "list" })}
        />
      )}
    </FloatingPanel>
  );
}
