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

/**
 * Right-click canvas context menu. Group order matches the visual
 * sections in the legacy `ToolboxContextual` layout:
 *  - deselect (1)
 *  - copy / paste / copy-classes / paste-classes (2)
 *  - select parent / move up / move down (3)
 *  - insert submenu items (4) — note: the chrome renders a hover submenu;
 *    these rows are also discoverable from the palette
 *  - duplicate / convert / delete (5)
 *  - AI (6)
 *
 * Group@N is globally monotonic so resolved sort matches visual order.
 */
const CANVAS_CONTEXT: MenuItem[] = [
  // Deselect
  { command: "ph.node.deselect", group: "deselect@10" },
  // Copy / Paste
  { command: "ph.node.copy", group: "copyPaste@20" },
  { command: "ph.node.copyClasses", group: "copyPaste@30" },
  { command: "ph.node.paste", group: "copyPaste@40" },
  { command: "ph.node.pasteClasses", group: "copyPaste@50" },
  // Nav
  { command: "ph.node.selectParent", group: "nav@60" },
  { command: "ph.node.moveUp", group: "nav@70" },
  { command: "ph.node.moveDown", group: "nav@80" },
  // Insert submenu rows
  { command: "ph.node.addBlockAbove", group: "insert@90" },
  { command: "ph.node.addBlockBelow", group: "insert@100" },
  { command: "ph.node.insertComponent", group: "insert@110" },
  { command: "ph.node.addEmptySection", group: "insert@120" },
  { command: "ph.node.addContainer", group: "insert@130" },
  // Duplicate / Convert / Delete
  { command: "ph.node.duplicate", group: "dupDel@140" },
  {
    command: "ph.node.convertToComponent",
    group: "dupDel@150",
    titleOverride: ctx => {
      const canMake = Boolean(
        (ctx as Record<string, unknown>)["canMakeSavedComponent"]
      );
      return canMake ? "Convert to component" : "Component exists";
    },
  },
  { command: "ph.node.delete", group: "dupDel@160" },
  // AI
  { command: "ph.node.aiContext", group: "ai@170" },
];

/**
 * Sidebar tab strip — Phase 2 C2e.
 *
 * Two pills: Components / Blocks. The Blocks pill is gated by
 * `features.blocksPanel.enabled !== false` via the command's own `when`
 * predicate; no per-location override needed.
 *
 * The trailing AI button stays a `toolbox/ai-button` slot contribution —
 * ToolboxTabs renders it via `<SlotRenderer>` outside this list.
 */
const SIDEBAR_TABS: MenuItem[] = [
  { command: "ph.editor.openComponentsPanel", group: "tabs@10" },
  { command: "ph.editor.openBlocksPanel", group: "tabs@20" },
];

export const BUILTIN_MENUS: Array<{ location: MenuLocation; items: MenuItem[] }> = [
  { location: "topbar", items: TOPBAR },
  { location: "navmenu/settings", items: NAVMENU_SETTINGS },
  { location: "navmenu/view", items: NAVMENU_VIEW },
  { location: "navmenu/tools", items: NAVMENU_TOOLS },
  { location: "navmenu/preferences", items: NAVMENU_PREFERENCES },
  { location: "canvas/context", items: CANVAS_CONTEXT },
  { location: "sidebar/tabs", items: SIDEBAR_TABS },
];
