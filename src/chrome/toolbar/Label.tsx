import { useEditor, useNode } from "@craftjs/core";
import { TbTrash } from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { atom, useAtomState, useAtomValue } from "@zedux/react";

import { ViewAtom } from "../viewport/atoms";
import { changeProp, getPropFinalValue } from "../viewport/viewportExports";
import { MultiScopeAtom } from "./breakpoint-chip/atoms";
import type { BpKey } from "../../utils/breakpointRewrite";

/**
 * Editor-wide modifier flags layered on top of the canvas-derived edit scope.
 * Phase 2 stripped the breakpoint keys (the canvas viewport is now the scope).
 * Only `dark:` survives — orthogonal concern, still toggled by TabBarDarkModeToggle.
 */
export type EditModifiers = {
  /** When true, class writes target `dark:` after the active breakpoint (and `dark:hover:` when editing hover). */
  dark: boolean;
};

export const EditModifiersAtom = atom<EditModifiers>("toolbar-edit-modifiers", {
  dark: false,
});

/** @deprecated Backwards-compat alias. New code should import EditModifiersAtom. */
export const ViewSelectionAtom = EditModifiersAtom;

/**
 * Class writes target the canvas-derived breakpoint by default. When the user
 * has alt-clicked cells in the chip popover to opt into multi-scope writes,
 * we honor that set instead — the `MultiScopeAtom` is opaque to most call
 * sites and overrides the canvas pick.
 */
export function defaultEffectiveViewsForCanvas(canvasView: string | undefined | null): string[] {
  const v = canvasView || "desktop";
  if (v === "desktop") return ["mobile"];
  if (v === "mobile") return ["mobile"];
  if (v === "sm" || v === "tablet") return ["sm"];
  if (v === "md") return ["md"];
  if (v === "lg") return ["lg"];
  if (v === "xl") return ["xl"];
  if (v === "2xl") return ["2xl"];
  return ["mobile"];
}

/**
 * Resolve the bp(s) the next class write should target.
 *
 * Phase 2 unified the rule: scope = canvas view. Power users who want to
 * write the same class to several breakpoints at once can opt in via the
 * chip popover's alt-click → `MultiScopeAtom`. When that set is non-empty,
 * it WINS over the canvas-derived single-scope.
 *
 * The `_modifiers` parameter is retained only for source-compatibility with
 * the old `viewSelection` first-argument shape — it is unused.
 */
export function getEffectiveViews(
  _modifiers: any,
  currentView: string,
  multiScope?: ReadonlySet<BpKey>
): string[] {
  if (multiScope && multiScope.size > 0) {
    return Array.from(multiScope);
  }
  return defaultEffectiveViewsForCanvas(currentView);
}

/** @deprecated Always returns false now — multi-scope is owned by `MultiScopeAtom`. */
export function breakpointScopeHasSelection(_viewSelection: any): boolean {
  return false;
}

// Re-export so consumers can still import the multi-scope atom from here if they want.
export { MultiScopeAtom };

// Function to resolve CSS variable to its computed value
const resolveCSSVar = (value: string): string => {
  if (!value || typeof window === "undefined") return value;

  // Check if it's a CSS variable reference
  const varMatch = value.match(/var\(--([^)]+)\)/);
  if (!varMatch) return value;

  const varName = `--${varMatch[1]}`;

  // Get computed value from root
  const computedValue = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

  if (computedValue) {
    // Replace the var() with the computed value
    return value.replace(/var\(--[^)]+\)/, computedValue);
  }

  return value;
};

// Function to display shortened value
const displayValue = (value: string): string => {
  if (!value) return "";

  // First resolve any CSS variables to their actual values
  const resolved = resolveCSSVar(value);

  // Clean up the display - remove brackets and extra formatting
  return resolved
    .replace(/\[([^\]]+)\]/g, "$1") // Remove brackets: gap-16 -> gap-4rem
    .replace(/^(\w+)-/, ""); // Remove prefix: gap-4rem -> 4rem
};

export const ToolbarLabel = ({
  lab,
  prefix,
  suffix,
  viewValue = "mobile",
  propType = "class",
  propKey,
  index = null,
  propItemKey = null,
  icon = null,
  showDeleteIcon = false,
  showVarSelector = false,
  varSelectorPrefix = "",
  iconOnly = false,
}: {
  lab?: string;
  prefix?: string;
  suffix?: string;
  viewValue?: string;
  propType?: string;
  propKey: string;
  index?: string;
  propItemKey?: string;
  icon?: React.ReactNode;
  showDeleteIcon?: boolean;
  showVarSelector?: boolean;
  varSelectorPrefix?: string;
  iconOnly?: boolean;
}) => {
  const {
    actions: { setProp },
    id,
    nodeProps,
  } = useNode(node => ({
    id: node.id,
    nodeProps: node.data?.props,
  }));

  const { query, actions } = useEditor();

  const currentView = useAtomValue(ViewAtom);
  const [modifiers] = useAtomState(EditModifiersAtom);

  // Get the actual value for this specific view using proper resolution logic
  const classDark = modifiers.dark ?? false;

  const { value: resolvedValue, viewValue: resolvedViewValue } = getPropFinalValue(
    { propKey, propType, index, propItemKey },
    viewValue,
    nodeProps,
    classDark
  );

  // Check if there's a resolved value for this view that was explicitly set on this view
  const isExplicit = resolvedViewValue === viewValue;
  const hasValue = resolvedValue != null && resolvedValue !== "" && isExplicit;

  // Active-view detection: chip lights up when its bp matches the canvas view.
  const canvasMatchesBadge =
    viewValue === currentView ||
    (currentView === "desktop" && viewValue === "mobile") ||
    (currentView === "md" && viewValue === "desktop");
  const isActiveView = canvasMatchesBadge;

  let view = viewValue;

  if (propType === "component" || propType === "root") {
    viewValue = "component";
    view = "component"; // Update view too!
  }

  const handleRemove = e => {
    e.preventDefault();
    e.stopPropagation();

    changeProp({
      propKey,
      value: null, // Use null instead of empty string for root props
      setProp,
      propType,
      view,
      index,
      propItemKey,
      query,
      actions,
      nodeId: id,
      classDark,
    });
  };

  // If no label and no var selector, don't render anything
  if (!lab && !showDeleteIcon && !showVarSelector) return null;

  const valText = `${prefix || ""}${displayValue(resolvedValue)}${suffix || ""}`;

  // Phase 2 dropped the per-bp dot rendering branch — `BreakpointChip` now owns
  // every breakpoint indicator next to a property label. ToolbarLabel is still
  // used for delete-icon / var-selector / icon-only chips below.

  // ─── Non-breakpoint views (icon, delete, var selector, etc.) ───
  const renderActiveNode = () => (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRemove}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleRemove(e as any);
        }
      }}
      onContextMenu={e => handleRemove(e)}
      className={`flex cursor-pointer items-center gap-0.5 rounded p-0.5 transition-colors ${
        isActiveView
          ? "bg-primary/10 text-primary ring-primary/20 ring-1"
          : "text-neutral-content hover:bg-accent hover:text-base-content"
      }`}
    >
      {icon ? (
        <span className="flex items-center text-[10px]">{icon}</span>
      ) : showDeleteIcon ? (
        <TbTrash className="size-3" />
      ) : (
        <span className="block min-w-0 truncate text-[10px]">
          {prefix}
          {resolvedValue}
          {suffix}
        </span>
      )}
    </div>
  );

  return (
    <>
      {lab && (
        <>
          {hasValue ? (
            iconOnly ? (
              <div
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content={valText}
                data-tooltip-place="top"
                data-tooltip-offset={10}
                className="text-xxs"
              >
                {renderActiveNode()}
              </div>
            ) : (
              renderActiveNode()
            )
          ) : null}
        </>
      )}
    </>
  );
};
