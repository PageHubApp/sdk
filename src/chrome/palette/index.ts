/**
 * Command palette (⌘K) — Phase 1 Wave B2.
 *
 * Floating search-driven palette over the commands registry. Mounted via
 * <CommandPaletteRoot /> at editor chrome level.
 */
export { CommandPalette } from "./CommandPalette";
export { CommandPaletteRoot } from "./CommandPaletteRoot";
export {
  useCommandPalette,
  useCommandPaletteShortcut,
  type UseCommandPaletteResult,
} from "./useCommandPalette";
export {
  computePaletteResults,
  useCommandPaletteResults,
  fuzzyScore,
  type PaletteEntry,
  type PaletteGroup,
  type FlattenedResults,
} from "./useCommandPaletteResults";
