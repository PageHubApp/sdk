/**
 * Singleton mount point for the command palette.
 *
 * Mounted once at editor chrome level. The ⌘K chord is owned by the
 * `ph.editor.openCommandPalette` builtin keybinding (Phase 2 C2i); this
 * component just renders <CommandPalette /> — open/close state reads from
 * `CommandPaletteAtom` via `useCommandPalette()`.
 */
import { CommandPalette } from "./CommandPalette";

export function CommandPaletteRoot() {
  return <CommandPalette />;
}
