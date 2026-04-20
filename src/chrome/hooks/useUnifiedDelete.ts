import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { useAtomValue } from "@zedux/react";
import { SettingsAtom } from "../../utils/atoms";
import { deleteNode } from "../viewport/viewportExports";

/**
 * Unified delete hook that handles node deletion consistently across all delete methods.
 * Uses the currently selected node from the editor state, so no props needed.
 */
export const useUnifiedDelete = () => {
  const { actions, query } = useEditor();
  const settings = useAtomValue(SettingsAtom);

  const deleteSelectedNode = async (useSimpleDelete = false) => {
    try {
      const selected = query.getEvent("selected").first();

      if (!selected) {
        console.warn("No node selected for deletion");
        return false;
      }

      const node = query.node(selected).get();

      if (!node) {
        console.warn("Selected node not found");
        return false;
      }

      // Check if node can be deleted
      const nodeType = node.data.props?.type;
      if (
        node.data.props?.canDelete === false ||
        node.data.custom?.permissions?.canDelete === false ||
        nodeType === "page" ||
        nodeType === "header" ||
        nodeType === "footer"
      ) {
        console.warn("Node cannot be deleted:", selected);
        return false;
      }

      // Mark element as being deleted BEFORE blurring (for contentEditable elements)
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && activeElement.isContentEditable) {
        activeElement.setAttribute("data-deleting", "true");
        activeElement.blur();
      }

      // Small delay to let blur complete
      setTimeout(() => {
        try {
          if (useSimpleDelete) {
            // Store parent ID before deletion for simple delete
            const parentId = node.data.parent;
            actions.delete(selected);
            // Select the parent node after deletion
            if (parentId && parentId !== ROOT_NODE) {
              actions.selectNode(parentId);
            }
          } else {
            deleteNode(query, actions, selected, settings);
          }
        } catch (error) {
          console.error("Error deleting node:", error);
        }
      }, 10);

      return true;
    } catch (error) {
      console.error("Error in unified delete:", error);
      return false;
    }
  };

  const deleteComponent = async (component: any) => {
    try {
      // The component.rootNodeId is the actual content node
      // We need to find and delete its parent (the component container)
      const contentNode = query.node(component.rootNodeId).get();
      if (contentNode) {
        const componentContainerId = contentNode.data.parent;
        const componentContainer = query.node(componentContainerId).get();

        // Make sure it's actually a component container
        if (componentContainer?.data?.props?.type === "component") {
          // Delete all instances (clones) of this component first
          const allNodes = query.getSerializedNodes();
          Object.entries(allNodes).forEach(([nodeId, node]: [string, any]) => {
            if (node.props?.relation?.belongsTo === component.rootNodeId) {
              // This is a clone instance - delete it
              actions.delete(nodeId);
            }
          });

          // Delete the component container (which contains the master)
          actions.delete(componentContainerId);

          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error deleting component:", error);
      return false;
    }
  };

  return {
    deleteSelectedNode,
    deleteComponent,
  };
};
