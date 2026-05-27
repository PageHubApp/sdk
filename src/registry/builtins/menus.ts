/**
 * Builtin menu contributions.
 *
 * Maps command ids into the menu locations that should render them. Phase 2
 * C2a covers the topbar; later waves contribute the rest of the locations
 * (navmenu/*, canvas/context, palette, sidebar/tabs, empty-state/cta,
 * tiptap/inline/*). Topbar items are listed in *visual order* — the topbar
 * header uses `flex-row-reverse`, so the first array entry renders rightmost.
 */
import type { MenuItem, MenuLocation } from "../types";

/**
 * Topbar — all items, in array order. The topbar uses `flex-row-reverse`
 * so the FIRST entry renders rightmost.
 *
 * `group@order` uses a globally monotonic order key so the resolved
 * sort matches the visual order exactly (group labels are documentation,
 * not sort keys — the menus registry sorts strictly on the numeric order).
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

export const BUILTIN_MENUS: Array<{ location: MenuLocation; items: MenuItem[] }> = [
  { location: "topbar", items: TOPBAR },
];
