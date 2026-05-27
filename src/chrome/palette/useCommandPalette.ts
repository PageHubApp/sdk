/**
 * Command palette open/close state.
 *
 * Phase 2 C2i: the ⌘K chord is now owned by the
 * `ph.editor.openCommandPalette` builtin command + keybinding (see
 * `packages/sdk/src/registry/builtins/commands.tsx` and
 * `packages/sdk/src/registry/builtins/keybindings.ts`). Surfaces that need
 * the open/close state still use this hook; the dispatcher handles the
 * keybinding centrally.
 */
import { useCallback } from "react";
import { useAtomState } from "@zedux/react";
import { CommandPaletteAtom } from "../toolbar/dialogs/dialogAtoms";

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
