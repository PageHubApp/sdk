/**
 * Chrome styling for the editor's pieces — `features.chrome`.
 *
 * Every class string a piece picks per style lives here, so a host can see the
 * whole difference in one file and the `default` column stays what the default layout
 * renders today. Components read it through `useChromeStyle()` and never
 * branch on the style themselves beyond "is this control shown".
 */
import { useSDKSafe } from "../../core/context";
import type { ChromeStyle } from "../../types/features";

export interface ChromeClasses {
  style: ChromeStyle;

  // ── Layers ──────────────────────────────────────────────────────────────
  layerRowSelected: string;
  layerRowIdle: string;
  layerRowHovered: string;
  layerDropInside: string;
  layerDropLine: string;
  /** Icon colour on a selected row. */
  layerSelectedIcon: string;
  layerSectionIcon: string;
  layerMutedIcon: string;
  layerRenameInput: string;

  // ── Inspector icon strip (`#toolbarTabs`) ───────────────────────────────
  inspectorTabRow: string;
  inspectorTabList: string;
  inspectorTabIndicator: string;
  inspectorSearchButton: string;
  inspectorSearchOpen: string;
  inspectorSearchIdle: string;
  inspectorCollapseButton: string;
  inspectorTabActive: string;
  inspectorTabIdle: string;
  /** The `dark:` variant-scope toggle in the strip. */
  showDarkVariantToggle: boolean;

  // ── Full-width "add" buttons ────────────────────────────────────────────
  dashedButton: string;

  // ── Add panel's Components / Blocks strip ───────────────────────────────
  sidebarTabPanelRoot: string;
  sidebarTabStrip: string;
  /** Pill row around the tabs; only the dashboard renders it. */
  sidebarTabPills: string | null;
  sidebarTabBase: string;
  sidebarTabActive: string;
  sidebarTabIdle: string;

  // ── Popovers ────────────────────────────────────────────────────────────
  floatingPanelHeader: string;
  floatingPanelTitle: string;
  floatingPanelClose: string;
  menuPanelFrame: string;
  menuItem: string;
  menuItemFocus: string;
  menuItemIdle: string;
  selectContent: string;

  // ── Search inputs (`SearchInput size="slim"`) ───────────────────────────
  searchSlim: {
    input: string;
    inputPadL: string;
    inputPadR: string;
    inputPadRWithClear: string;
    icon: string;
    iconColor: string;
    clear: string;
    clearIcon: string;
  } | null;
}

export const CHROME_CLASSES: Record<ChromeStyle, ChromeClasses> = {
  default: {
    style: "default",

    layerRowSelected: "bg-blue-600 text-white dark:bg-blue-500",
    layerRowIdle: "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/70",
    layerRowHovered: "bg-gray-100 dark:bg-gray-800/70",
    layerDropInside: "ring-1 ring-blue-500 ring-inset",
    layerDropLine: "relative h-0.5 w-full bg-blue-500",
    layerSelectedIcon: "text-white",
    layerSectionIcon: "text-blue-500",
    layerMutedIcon: "text-gray-500 dark:text-gray-400",
    layerRenameInput:
      "w-full rounded border border-blue-500 bg-white px-0.5 py-0 text-xs leading-none text-gray-900 outline-none dark:bg-gray-800 dark:text-gray-100",

    inspectorTabRow:
      "border-base-300/60 bg-base-100 text-base-content relative flex h-10 w-full min-w-0 shrink-0 items-center gap-2 border-b px-3 py-0 text-center font-semibold",
    inspectorTabList: "relative flex min-w-48 shrink-0 flex-row-reverse items-center gap-2 pr-3",
    inspectorTabIndicator: "bg-primary absolute bottom-0 h-0.5 rounded-full",
    inspectorSearchButton:
      "inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md transition-[color,background-color,transform] active:scale-90",
    inspectorSearchOpen: "text-primary",
    inspectorSearchIdle: "text-secondary-content hover:text-base-content",
    inspectorCollapseButton:
      "text-secondary-content/70 hover:text-base-content flex size-10 cursor-pointer items-center justify-center rounded-md p-0 text-sm transition-[color,transform] active:scale-90",
    inspectorTabActive: "text-primary opacity-100",
    inspectorTabIdle: "text-secondary-content hover:text-base-content opacity-45 hover:opacity-100",
    showDarkVariantToggle: true,

    dashedButton: "ph-toolbar-dashed-btn",

    sidebarTabPanelRoot: "",
    sidebarTabStrip: "flex min-w-0",
    sidebarTabPills: null,
    sidebarTabBase:
      "flex min-w-0 flex-1 cursor-pointer items-center justify-center text-sm font-medium transition-colors",
    sidebarTabActive: "bg-sidebar-accent text-sidebar-accent-foreground",
    sidebarTabIdle:
      "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",

    floatingPanelHeader:
      "text-base-content flex touch-none items-center justify-between px-3 py-1.5",
    floatingPanelTitle: "text-xs font-semibold",
    floatingPanelClose: "text-accent-content hover:bg-accent-content/10 rounded p-0.5 transition-colors",
    menuPanelFrame: "overflow-hidden rounded-xl border p-1 shadow-xl",
    menuItem:
      "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left text-xs transition-colors",
    menuItemFocus: "bg-base-200 text-base-content",
    menuItemIdle: "text-base-content",
    selectContent: "pagehub-sdk-root ph-select-content",

    searchSlim: null,
  },

  // The PageHub dashboard kit: neutral tints are alphas of `base-content`,
  // the selection is black (white in dark mode), panels are `rounded-lg`
  // with a `base-300` border, tabs are 32px pills.
  dashboard: {
    style: "dashboard",

    layerRowSelected: "bg-base-content text-base-100",
    layerRowIdle: "text-base-content hover:bg-base-content/[0.05]",
    layerRowHovered: "bg-base-content/[0.05]",
    layerDropInside: "ring-1 ring-base-content ring-inset",
    layerDropLine: "relative h-0.5 w-full bg-base-content",
    layerSelectedIcon: "text-base-100",
    layerSectionIcon: "text-base-content/55",
    layerMutedIcon: "text-base-content/50",
    layerRenameInput:
      "w-full rounded border border-base-content/40 bg-base-100 px-0.5 py-0 text-xs leading-none text-base-content outline-none",

    inspectorTabRow:
      "border-base-300 bg-base-100 text-base-content relative flex h-10 w-full min-w-0 shrink-0 items-center gap-1 border-b px-3 py-0 text-center font-semibold",
    inspectorTabList: "relative flex min-w-0 shrink-0 flex-row-reverse items-center gap-1",
    inspectorTabIndicator: "bg-base-content absolute bottom-0 h-0.5 rounded-full",
    inspectorSearchButton:
      "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-[color,background-color,transform] active:scale-90",
    inspectorSearchOpen: "text-base-content",
    inspectorSearchIdle: "text-base-content/50 hover:text-base-content",
    inspectorCollapseButton:
      "text-base-content/50 hover:text-base-content flex size-8 cursor-pointer items-center justify-center rounded-md p-0 text-sm transition-[color,transform] active:scale-90",
    inspectorTabActive: "text-base-content opacity-100",
    inspectorTabIdle: "text-base-content/50 hover:text-base-content opacity-100",
    showDarkVariantToggle: false,

    dashedButton:
      "border-base-300 bg-base-100 text-base-content hover:border-base-content/30 hover:bg-base-content/[0.03] flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",

    sidebarTabPanelRoot: "divide-y-0",
    sidebarTabStrip: "flex min-w-0 items-center gap-2 px-3 pt-1 pb-2",
    sidebarTabPills: "bg-base-content/[0.05] flex min-w-0 flex-1 gap-0.5 rounded-lg p-0.5",
    sidebarTabBase:
      "flex h-8 min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-base-content/25 [&>svg]:size-4 [&>svg]:shrink-0",
    sidebarTabActive: "bg-base-100 text-base-content ring-base-content/10 shadow-sm ring-1",
    sidebarTabIdle: "text-base-content/60 hover:text-base-content",

    floatingPanelHeader:
      "text-base-content border-base-300 flex touch-none items-center justify-between border-b px-3 py-2",
    floatingPanelTitle: "text-xs font-medium",
    floatingPanelClose:
      "text-base-content/50 hover:bg-base-content/[0.06] hover:text-base-content rounded-md p-0.5 transition-colors",
    menuPanelFrame: "overflow-hidden rounded-lg border p-1 shadow-xl",
    menuItem:
      "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
    menuItemFocus: "bg-base-content/[0.05] text-base-content",
    menuItemIdle: "text-base-content/80",
    selectContent: "pagehub-sdk-root ph-select-content ph-select-content--dashboard",

    searchSlim: {
      input:
        "border-base-300 bg-base-100 text-base-content placeholder:text-base-content/35 flex h-8 w-full rounded-lg border text-xs transition-colors focus:border-base-content/40 focus:ring-2 focus:ring-base-content/10 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      inputPadL: "pl-8",
      inputPadR: "pr-2.5",
      inputPadRWithClear: "pr-8",
      icon: "left-2.5 size-3.5",
      iconColor: "text-base-content/40",
      clear: "right-1.5 size-5",
      clearIcon: "size-3.5",
    },
  },
};

/** Resolve `features.chrome` to a style; anything but `"dashboard"` is the default. */
export function resolveChromeStyle(chrome: unknown): ChromeStyle {
  return chrome === "dashboard" ? "dashboard" : "default";
}

/** The class choices for the mounted editor's `features.chrome`. Default outside a provider. */
export function useChromeStyle(): ChromeClasses {
  const sdk = useSDKSafe();
  return CHROME_CLASSES[resolveChromeStyle(sdk?.features.chrome)];
}
