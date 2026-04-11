/**
 * Editor resolver — same component map as the viewer.
 *
 * Craft config (`.craft`) is attached by `processForEditor()` from `defineComponent()`
 * definitions in `builtins.ts`. Importing `.craft.tsx` modules here only for their
 * side effects would duplicate the chrome bundle; the viewer imports are enough.
 */
export { viewerResolver as editorResolver } from "./viewer";
