import { useEditorRootRect } from "../../chrome/shell/editorRootRect";

/** Matches Tailwind `md` (768px): an editor narrower than this overlays the settings toolbar. */
const OVERLAY_BELOW_PX = 768;

/**
 * True when the editor chrome should use the overlay (absolute) settings
 * toolbar instead of the docked flex column. Measured on the editor root, not
 * the window, so an editor in part of a host page decides by its own width.
 */
export function useEditorToolbarOverlayLayout(): boolean {
  return useEditorRootRect(r => r.width < OVERLAY_BELOW_PX);
}
