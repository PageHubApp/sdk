/**
 * Non-hook delete primitives. The original `useUnifiedDelete` hook delegates
 * to these so command `run` bodies can reuse the exact logic without picking
 * up a React lifecycle.
 *
 * Behavior preserved verbatim from the hook:
 *   - resolves selection via `query.getEvent("selected").first()` when no id
 *     is passed
 *   - refuses to delete page / header / footer / `canDelete: false` /
 *     `custom.permissions.canDelete: false` nodes
 *   - blurs any contentEditable element BEFORE deletion to release Tiptap's
 *     focus handler; flagged with `data-deleting="true"`
 *   - `useSimpleDelete`: calls `actions.delete` directly + selects parent
 *   - otherwise: delegates to `deleteNode` (handles has-many cleanup + media
 *     reference cleanup)
 */
import { ROOT_NODE } from "@craftjs/utils";
import { deleteNode } from "../viewport/state/viewportExports";
import { sdkLog } from "../../utils/logger";

export interface UnifiedDeleteOptions {
  /** Force selection-event-derived id when omitted. */
  id?: string | null;
  /** Skip the rich `deleteNode` cleanup (has-many, media) and just remove. */
  useSimpleDelete?: boolean;
  /** Site settings — used by `deleteNode` for media reference cleanup. */
  settings?: unknown;
}

/**
 * Delete the currently selected node (or `opts.id` when provided).
 * Returns false when the node can't be deleted; true when scheduled.
 */
export async function unifiedDeleteNode(
  query: any,
  actions: any,
  opts: UnifiedDeleteOptions = {}
): Promise<boolean> {
  try {
    const selected =
      opts.id ?? (query.getEvent("selected").first() as string | undefined);
    if (!selected) {
      sdkLog.warn("No node selected for deletion");
      return false;
    }
    const node = query.node(selected).get();
    if (!node) {
      sdkLog.warn("Selected node not found");
      return false;
    }

    const nodeType = node.data.props?.type;
    if (
      node.data.props?.canDelete === false ||
      node.data.custom?.permissions?.canDelete === false ||
      nodeType === "page" ||
      nodeType === "header" ||
      nodeType === "footer"
    ) {
      sdkLog.warn("Node cannot be deleted:", selected);
      return false;
    }

    if (typeof document !== "undefined") {
      const activeElement = document.activeElement as
        | (Element & { isContentEditable?: boolean; blur?: () => void })
        | null;
      if (activeElement?.isContentEditable) {
        activeElement.setAttribute?.("data-deleting", "true");
        activeElement.blur?.();
      }
    }

    setTimeout(() => {
      try {
        if (opts.useSimpleDelete) {
          const parentId = node.data.parent;
          actions.delete(selected);
          if (parentId && parentId !== ROOT_NODE) {
            actions.selectNode(parentId);
          }
        } else {
          void deleteNode(query, actions, selected, opts.settings);
        }
      } catch (err) {
        sdkLog.error("Error deleting node:", err);
      }
    }, 10);

    return true;
  } catch (err) {
    sdkLog.error("Error in unified delete:", err);
    return false;
  }
}

/**
 * Delete a saved component — clones first, then container.
 * Pure mirror of `useUnifiedDelete().deleteComponent`.
 */
export async function unifiedDeleteComponent(
  query: any,
  actions: any,
  component: { rootNodeId?: string }
): Promise<boolean> {
  try {
    if (!component?.rootNodeId) return false;
    const contentNode = query.node(component.rootNodeId).get();
    if (!contentNode) return false;
    const componentContainerId = contentNode.data.parent;
    const componentContainer = query.node(componentContainerId).get();
    if (componentContainer?.data?.props?.type !== "component") return false;

    const allNodes = query.getSerializedNodes();
    Object.entries(allNodes).forEach(([nodeId, n]: [string, any]) => {
      if (n.props?.relation?.belongsTo === component.rootNodeId) {
        actions.delete(nodeId);
      }
    });
    actions.delete(componentContainerId);
    return true;
  } catch (err) {
    sdkLog.error("Error deleting component:", err);
    return false;
  }
}
