/**
 * @pagehub/sdk/editor/pieces — the editor's visible parts, for hosts that
 * arrange the editor themselves.
 *
 * Render `<PageHubEditor layout="none">` and place these as its children,
 * directly or through `createPortal` into your own layout (React context
 * passes through portals). Every piece must stay a descendant of
 * `<PageHubEditor>`. The editor's document load/save, shortcuts, ⌘K palette
 * and dialogs run on their own; pieces are only what you see.
 *
 * `layout="default"` (what `/build` uses) is built from these same pieces.
 * See docs/sdk/editor-pieces.md.
 */
export { EditorCanvas } from "../chrome/shell/EditorCanvas";
export { EditorInspector } from "../chrome/toolbar/EditorInspector";
export { EditorLayers } from "../chrome/toolbar/EditorLayers";
export { ToolboxTabs as EditorAddPanel } from "../chrome/viewport/nav/ToolboxTabs";
export { ThemeSettingsPanel as EditorThemePanel } from "../chrome/viewport/modals/ThemeSettingsPanel";
export {
  EditorTopBarActions,
  type EditorTopBarActionsProps,
} from "../chrome/viewport/ViewportTopBar/EditorTopBarActions";
export { PageSelector as EditorPageSelector } from "../chrome/viewport/pickers/PageSelector";
export { EditorBreadcrumb } from "../chrome/viewport/nav/EditorBreadcrumb";
export { SaveIndicator as EditorSaveStatus } from "../chrome/viewport/ViewportTopBar/SaveIndicator";
export { EditorSaveBanner } from "../chrome/shell/EditorSaveBanner";
export {
  EditorPanelFrame,
  type EditorPanelFrameProps,
} from "../chrome/shell/EditorPanelFrame";
