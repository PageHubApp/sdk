import { useEditor, useNode } from "@craftjs/core";
import { TbTrash } from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { atom, useAtomState, useAtomValue } from "@zedux/react";

import { ViewAtom } from "../viewport/atoms";
import { changeProp, getPropFinalValue } from "../viewport/viewportExports";
import { VIEW_BREAKPOINT_SCOPE_KEYS } from "../../utils/tailwind/className";

// Global state for view selection (which Tailwind layers the next edit applies to)
export const ViewSelectionAtom = atom("toolbar-view-selection", {
  mobile: false,
  sm: false,
  desktop: false,
  lg: false,
  xl: false,
  "2xl": false,
  /** When true, class writes target `dark:` after the active breakpoint (and `dark:hover:` when editing hover). */
  dark: false,
});

export function breakpointScopeHasSelection(viewSelection: Record<string, boolean>): boolean {
  return VIEW_BREAKPOINT_SCOPE_KEYS.some(k => viewSelection[k]);
}

/**
 * When no scope badges/toggles are on, class-style edits follow the editor canvas breakpoint
 * (CANVAS WIDTH). Full-width fluid (`desktop`) targets the base layer only; use the MD canvas
 * mode for `md:` utilities.
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

// Helper function to get effective views based on selection
export const getEffectiveViews = (viewSelection: Record<string, boolean>, currentView: string) => {
  if (!breakpointScopeHasSelection(viewSelection)) {
    return defaultEffectiveViewsForCanvas(currentView);
  }

  const views = [];
  for (const k of VIEW_BREAKPOINT_SCOPE_KEYS) {
    // Scope key `desktop` is the md layer; class writes use `md` so ViewAtom `desktop` (full width) stays unambiguous.
    if (viewSelection[k]) views.push(k === "desktop" ? "md" : k);
  }
  return views;
};

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
    nodeProps: node.data.props,
  }));

  const { query, actions } = useEditor();

  const currentView = useAtomValue(ViewAtom);
  const [viewSelection, setViewSelection] = useAtomState(ViewSelectionAtom);

  // Get the actual value for this specific view using proper resolution logic
  const classDark = viewSelection.dark ?? false;

  const { value: resolvedValue, viewValue: resolvedViewValue } = getPropFinalValue(
    { propKey, propType, index, propItemKey },
    viewValue,
    nodeProps,
    classDark
  );

  // Check if there's a resolved value for this view that was explicitly set on this view
  const isExplicit = resolvedViewValue === viewValue;
  const hasValue = resolvedValue != null && resolvedValue !== "" && isExplicit;

  // Check if this view is selected in the toggle
  const isSelected = viewSelection[viewValue];

  // Only show primary color if this view is selected, or if none selected and this is current view
  const hasSelection = breakpointScopeHasSelection(viewSelection);
  const canvasMatchesBadge =
    viewValue === currentView ||
    (currentView === "desktop" && viewValue === "mobile") ||
    (currentView === "md" && viewValue === "desktop");
  const isActiveView = isSelected || (!hasSelection && canvasMatchesBadge);

  let view = viewValue;

  if (propType === "component" || propType === "root") {
    viewValue = "component";
    view = "component"; // Update view too!
  }

  const handleToggle = e => {
    e.preventDefault();
    e.stopPropagation();

    // Toggle this view selection
    setViewSelection(prev => ({
      ...prev,
      [viewValue]: !prev[viewValue],
    }));
  };

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

  // ─── Breakpoint views: only render when value is defined ───
  const isBreakpointView =
    viewValue === "mobile" ||
    viewValue === "desktop" ||
    viewValue === "sm" ||
    viewValue === "lg" ||
    viewValue === "xl" ||
    viewValue === "2xl";

  if (lab && isBreakpointView && !icon && !showDeleteIcon) {
    const bpLabel = viewValue === "mobile" ? "base" : viewValue === "desktop" ? "md" : viewValue;
    const dot = (
      <span
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle(e as any);
          }
        }}
        onContextMenu={hasValue ? handleRemove : undefined}
        data-has-value={hasValue || undefined}
        className={`bg-base-content block size-1.5 cursor-pointer rounded-[1px] transition-opacity ${hasValue ? "opacity-100" : "opacity-20"}`}
      />
    );
    const tip = hasValue ? `${bpLabel}: ${valText}` : `${bpLabel}: none`;
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleToggle(e as any);
          }
        }}
        onContextMenu={hasValue ? handleRemove : undefined}
        data-has-value={hasValue || undefined}
        className={`bg-base-content block size-1.5 cursor-pointer rounded-[1px] transition-opacity ${hasValue ? "opacity-100" : "opacity-20"}`}
        data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
        data-tooltip-content={tip}
        data-tooltip-place="top"
        data-tooltip-offset={10}
      />
    );
  }

  // ─── Non-breakpoint views (icon, delete, var selector, etc.) ───
  const renderActiveNode = () => (
    <div
      role="button"
      tabIndex={0}
      onClick={handleToggle}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleToggle(e as any);
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
