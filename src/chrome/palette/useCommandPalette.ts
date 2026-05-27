/**
 * Command palette open/close state + the ⌘K (Ctrl+K) global listener.
 *
 * Phase 1 Wave B2: this is the ONLY chord-listener the palette mounts. The
 * generic keybinding dispatcher lands in Wave B1; once it ships, ⌘K will be
 * driven by the `ph.editor.openCommandPalette` builtin keybinding instead.
 * Until then, we gate the chord against the canonical
 * `isInsideTextEditingSurface` predicate so the Tiptap link-panel can keep
 * its own ⌘K behavior intact.
 */
import { useCallback, useEffect } from "react";
import { useAtomState } from "@zedux/react";
import { CommandPaletteAtom } from "../toolbar/dialogs/dialogAtoms";
import { isInsideTextEditingSurface } from "../../utils/keyboard/isInsideTextEditingSurface";

export interface UseCommandPaletteResult {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export function useCommandPalette(): UseCommandPaletteResult {
  const [state, setState] = useAtomState(CommandPaletteAtom);
  const open = Boolean(state?.open);

  const setOpen = useCallback(
    (next: boolean) => {
      setState({ open: next });
    },
    [setState]
  );
  const toggle = useCallback(() => {
    setState(prev => ({ open: !prev?.open }));
  }, [setState]);

  return { open, setOpen, toggle };
}

/**
 * Mount the global ⌘K listener. Idempotent — only mounts once per element
 * lifetime via `useEffect`. Should be called from a single chrome-level
 * component (CommandPaletteRoot).
 */
export function useCommandPaletteShortcut() {
  const { open, setOpen } = useCommandPalette();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isCmdK =
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        (event.key === "k" || event.key === "K");
      if (!isCmdK) return;

      // Honor the Tiptap link-panel binding when text is being edited.
      if (isInsideTextEditingSurface(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
      // Toggle: if already open, close (matches macOS Spotlight behavior).
      setOpen(!open);
    };

    // Use capture so we win over editor chrome listeners that don't
    // discriminate between editing surfaces.
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [open, setOpen]);
}
