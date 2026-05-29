import { ROOT_NODE } from "@craftjs/utils";
import { useEffect } from "react";
import { ComponentsAtom, useSetAtomState } from "../../../utils/atoms";
import { sdkLog } from "../../../utils/logger";

/**
 * Reads ROOT children, filters `props.type === "component"`, and writes a
 * serialized payload for the components dropdown into `ComponentsAtom`.
 * Re-runs on `componentFingerprint` changes (string built from the component
 * containers' nested counts in the parent's `useEditor` selector).
 */
export function useTopBarComponents({
  query,
  enabled,
  componentFingerprint,
}: {
  query: any;
  enabled: boolean;
  componentFingerprint: string;
}) {
  const setComponents = useSetAtomState(ComponentsAtom);

  useEffect(() => {
    if (!query || !enabled) return;

    try {
      const rootNode = query.node(ROOT_NODE).get();
      const rootChildren = rootNode?.data?.nodes || [];

      const componentNodes = rootChildren
        .map((nodeId: string) => {
          try {
            const node = query.node(nodeId).get();
            if (node?.data?.props?.type === "component") {
              const childNodeId = node.data.nodes?.[0];

              if (childNodeId) {
                const tree = query.node(childNodeId).toNodeTree();
                const nodePairs = Object.keys(tree.nodes).map(id => [
                  id,
                  query.node(id).toSerializedNode(),
                ]);
                const entries = Object.fromEntries(nodePairs);
                const serializedNodes = JSON.stringify(entries);

                return {
                  rootNodeId: childNodeId,
                  nodes: serializedNodes,
                  name:
                    node?.data?.custom?.displayName ||
                    node?.data?.displayName ||
                    "Unnamed Component",
                  isSection: node?.data?.props?.isSection || false,
                };
              }
            }
          } catch (_e) {
            return null;
          }
          return null;
        })
        .filter(Boolean);

      setComponents(componentNodes);
    } catch (e) {
      sdkLog.error("❌ Error loading components:", e);
    }
  }, [query, enabled, setComponents, componentFingerprint]);
}
