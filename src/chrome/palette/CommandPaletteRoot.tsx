/**
 * Singleton mount point for the command palette.
 *
 * Mounted once at editor chrome level. Owns the global ⌘K listener (Wave B2
 * temporary — Wave B1 will eventually drive open via the
 * `ph.editor.openCommandPalette` keybinding through the registry dispatcher)
 * and renders <CommandPalette /> when open.
 */
import { CommandPalette } from "./CommandPalette";
import { useCommandPaletteShortcut } from "./useCommandPalette";

export function CommandPaletteRoot() {
  useCommandPaletteShortcut();
  return <CommandPalette />;
}
