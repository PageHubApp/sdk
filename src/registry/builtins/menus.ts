/**
 * Builtin menu contributions.
 *
 * Maps command ids into the menu locations that should render them. Phase 2
 * C2a covers the topbar; C2b adds the four navmenu drawer locations
 * (settings / view / tools / preferences). Later waves contribute the rest
 * (canvas/context, palette, sidebar/tabs, empty-state/cta, tiptap/inline/*).
 *
 * `group@order` keys are globally monotonic so the resolved sort matches
 * visual order exactly. Group label is documentation only.
 */
import type { MenuItem, MenuLocation } from "../types";

/**
 * Topbar — all items, in array order. The topbar uses `flex-row-reverse`
 * so the FIRST entry renders rightmost.
 */
const TOPBAR: MenuItem[] = [
  { command: "ph.editor.insert", group: "primary@10" },
  { command: "ph.editor.redo", group: "history@20" },
  { command: "ph.editor.undo", group: "history@30" },
  // BreakpointSwitcher is a special-case submenu — see ViewportTopBar render
  // for the inline mount. It's not contributed here because its dropdown is
  // a custom popover (mode/breakpoint chip grid + zoom slider). Visually it
  // sits at order ~40 (between undo and togglePreview).
  { command: "ph.editor.togglePreview", group: "view@50" },
  { command: "ph.canvas.toggleViewMode", group: "view@60" },
  { command: "ph.editor.save", group: "save@70" },
  { command: "ph.editor.openMore", group: "more@80" },
];

/**
 * Nav menu drawer — Settings section.
 *
 * `ph.site.selectBackground` is only visible to tenant users
 * (`features.directSave === true` — gated by command-level `when`).
 * On non-tenant the user sees Theme + Media only.
 */
const NAVMENU_SETTINGS: MenuItem[] = [
  { command: "ph.site.selectBackground", group: "settings@10" },
  { command: "ph.theme.open", args: { cat: "colors" }, group: "settings@20" },
  { command: "ph.media.open", group: "settings@30" },
];

/** Nav menu drawer — View section (layers + canvas overlays). */
const NAVMENU_VIEW: MenuItem[] = [
  { command: "ph.layers.popOut", group: "view@10" },
  {
    command: "ph.layers.toggleDock",
    group: "view@20",
    titleOverride: ctx => {
      const open = Boolean((ctx as Record<string, unknown>)["sidebarLayersOpen"]);
      return open ? "Hide layers panel" : "Dock layers panel";
    },
  },
  {
    command: "ph.canvas.toggleGridLines",
    group: "view@30",
    titleOverride: ctx => {
      const on = Boolean((ctx as Record<string, unknown>)["showGridLines"]);
      return on ? "Hide grid lines" : "Show grid lines";
    },
  },
  {
    command: "ph.canvas.toggleBreakpointMarkers",
    group: "view@40",
    titleOverride: ctx => {
      const on = Boolean((ctx as Record<string, unknown>)["showBreakpointMarkers"]);
      return on ? "Hide breakpoint lines" : "Show breakpoint lines";
    },
  },
  {
    command: "ph.canvas.toggleDeviceGuides",
    group: "view@50",
    titleOverride: ctx => {
      const on = Boolean((ctx as Record<string, unknown>)["showDeviceGuides"]);
      return on ? "Hide device guides" : "Show device guides";
    },
  },
  {
    command: "ph.canvas.toggleHidden",
    group: "view@60",
    titleOverride: ctx => {
      const on = Boolean((ctx as Record<string, unknown>)["showHidden"]);
      return on ? "Hide hidden components" : "Show hidden components";
    },
  },
];

/** Nav menu drawer — Tools section. */
const NAVMENU_TOOLS: MenuItem[] = [
  { command: "ph.modifiers.open", group: "tools@10" },
  { command: "ph.importExport.open", group: "tools@20" },
];

/**
 * Nav menu drawer — Preferences section. Both items title themselves
 * dynamically from the current atom state (via context keys set by the
 * navigation surface).
 */
const NAVMENU_PREFERENCES: MenuItem[] = [
  {
    command: "ph.ui.toggleSidebarSide",
    group: "preferences@10",
    titleOverride: ctx => {
      const left = Boolean((ctx as Record<string, unknown>)["sideBarLeft"]);
      return left ? "Move settings panel to the right" : "Move settings panel to the left";
    },
  },
  {
    // dark-mode command provides its own dynamic title; no override needed.
    command: "ph.ui.toggleDarkMode",
    group: "preferences@20",
  },
];

export const BUILTIN_MENUS: Array<{ location: MenuLocation; items: MenuItem[] }> = [
  { location: "topbar", items: TOPBAR },
  { location: "navmenu/settings", items: NAVMENU_SETTINGS },
  { location: "navmenu/view", items: NAVMENU_VIEW },
  { location: "navmenu/tools", items: NAVMENU_TOOLS },
  { location: "navmenu/preferences", items: NAVMENU_PREFERENCES },
];
