import { useEditor } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { SettingsAtom } from "../../utils/atoms";
import { unifiedDeleteComponent, unifiedDeleteNode } from "./unifiedDelete";

/**
 * Unified delete hook — thin wrapper over `unifiedDelete[Node|Component]`.
 * Surfaces still import this hook; command `run` bodies use the underlying
 * non-hook helpers directly via the editor backref.
 */
export const useUnifiedDelete = () => {
  const { actions, query } = useEditor();
  const settings = useAtomValue(SettingsAtom);

  const deleteSelectedNode = (useSimpleDelete = false) =>
    unifiedDeleteNode(query, actions, { useSimpleDelete, settings });

  const deleteComponent = (component: any) =>
    unifiedDeleteComponent(query, actions, component);

  return { deleteSelectedNode, deleteComponent };
};
