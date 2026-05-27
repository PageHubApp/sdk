import { useAtomState } from "@zedux/react";
import { useCallback } from "react";
import { ToolboxMenu, toolboxMenuInitialState } from "../../../rendering/toolboxMenuAtom";

/**
 * Minimal menu state hook — Phase 2 C2c slimmed this down to just menu
 * open/close. Selection gates / handlers / clipboard checks all live in
 * the command registry now (`packages/sdk/src/registry/builtins/commands.tsx`
 * + `packages/sdk/src/registry/selectionContext.ts`).
 */
export function useToolboxMenuModel() {
  const [menu, setMenu] = useAtomState(ToolboxMenu);
  const id = menu.id || "";

  const closeMenu = useCallback(() => {
    setMenu({ ...toolboxMenuInitialState });
  }, [setMenu]);

  return { menu, id, closeMenu };
}

export type ToolboxMenuModel = ReturnType<typeof useToolboxMenuModel>;
