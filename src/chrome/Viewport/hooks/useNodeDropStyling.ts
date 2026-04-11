import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { useEffect, useRef } from "react";
import { useAtomValue, useEcosystem } from "@zedux/react";
import { BatchOperationAtom } from "utils/atoms";

/**
 * Auto-styles containers dropped into the editor tree:
 * - Dropped into Page → becomes "Section" with w-full flex-col
 * - Dropped into Section → becomes "Content" with container padding/gap/width
 * - Dropped into Content → gets standard container styling
 * Also auto-selects and scrolls to the newly dropped node.
 */
export function useNodeDropStyling() {
  const { actions, query, nodeIdKeys } = useEditor((state, query) => ({
    nodeIdKeys: Object.keys(state.nodes).join(","),
  }));

  const nodeIdsRef = useRef<Set<string> | undefined>(undefined);
  const ecosystem = useEcosystem();

  useEffect(() => {
    const prevIds = nodeIdsRef.current;
    const currentNodeIds = nodeIdKeys ? nodeIdKeys.split(",") : [];

    if (!prevIds) {
      nodeIdsRef.current = new Set(currentNodeIds);
      return;
    }

    if (currentNodeIds.length !== prevIds.size) {
      const newNodeIds = new Set(currentNodeIds);
      const diffIds = [...newNodeIds].filter(id => !prevIds.has(id));

      if (diffIds.length) {
        const newNodeId = diffIds[0];
        const newNode = query.node(newNodeId).get();
        const parentNode = newNode?.data?.parent ? query.node(newNode.data.parent).get() : null;

        if (parentNode) {
          const nodeType = (newNode?.data?.type as any)?.resolvedName || newNode?.data?.type;
          const isContainer = nodeType === "Container";
          const currentDisplayName = newNode?.data?.custom?.displayName || newNode?.data?.displayName || "";

          const isFromTemplate =
            currentDisplayName &&
            currentDisplayName !== "Container" &&
            currentDisplayName !== "Section" &&
            currentDisplayName !== "Content" &&
            currentDisplayName !== "Row" &&
            currentDisplayName !== "Column";

          // Dropped into Page → Section
          if (parentNode.data.props?.type === "page" && isContainer && !isFromTemplate) {
            actions.setProp(newNodeId, (props: any) => {
              props.className = "w-full flex flex-col";
              props.type = "section";
            });
            actions.setCustom(newNodeId, (custom: any) => (custom.displayName = "Section"));
          }

          // Dropped into Section → Content
          if (parentNode.data.custom?.displayName === "Section" && isContainer && !isFromTemplate) {
            actions.setProp(newNodeId, (props: any) => {
              props.className = "flex flex-col w-full gap-container items-center py-container-y px-container-x mx-auto max-w-page";
            });
            actions.setCustom(newNodeId, (custom: any) => (custom.displayName = "Content"));
          }

          // Dropped into Content → styled container
          if (parentNode.data.custom?.displayName === "Content" && isContainer && !isFromTemplate) {
            actions.setProp(newNodeId, (props: any) => {
              props.className = "flex flex-col items-center gap-container w-full max-w-page p-container-y";
            });
          }
        }

        // Auto-scroll to new node (skip during batch operations)
        // To re-enable auto-select on drop, uncomment:
        // if (newNodeId !== ROOT_NODE && !isBatch && query.node(newNodeId).get()) {
        //   actions.selectNode(newNodeId);
        // }
        const isBatch = ecosystem.getInstance(BatchOperationAtom).getState();
        if (newNodeId !== ROOT_NODE && !isBatch) {
          setTimeout(() => {
            const node = query.node(newNodeId).get();
            if (node?.dom) {
              node.dom.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }, 100);
        }
      }
      nodeIdsRef.current = newNodeIds;
    }
  }, [nodeIdKeys, query]);
}
