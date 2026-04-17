/**
 * Hook to sync linked component instances when master component structure changes.
 * Prop sync is handled by the useEditor collector in getClonedState — this hook
 * only handles structural changes (children added/removed/reordered).
 */
import { useEditor } from "@craftjs/core";
import { useEffect, useRef } from "react";
import { useAtomValue } from "@zedux/react";
import { ComponentsAtom } from "../../utils/lib";
import { buildClonedTree } from "../viewport/viewportExports";
import { setRecursiveBelongsTo } from "@/utils/componentUtils";

const CONTENT_PROPS = [
  "text", "url", "urlTarget", "action", "image",
  "videoId", "content", "buttonText", "placeholder", "value",
];

export const useComponentSync = () => {
  const { query, actions } = useEditor();
  const components = useAtomValue(ComponentsAtom);
  const lastStructureRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!components || components.length === 0) return;

    components.forEach(component => {
      const masterNodeId = component.rootNodeId;
      try {
        const masterNode = query.node(masterNodeId).get();
        if (!masterNode) return;

        const currentSignature = getStructureSignature(masterNodeId, query);
        const lastSignature = lastStructureRef.current.get(masterNodeId);

        if (lastSignature && lastSignature !== currentSignature) {
          rebuildLinkedInstances(masterNodeId, query, actions);
        }

        lastStructureRef.current.set(masterNodeId, currentSignature);
      } catch {}
    });
  }, [components, query, actions]);
};

function getStructureSignature(nodeId: string, query: any): string {
  try {
    const node = query.node(nodeId).get();
    if (!node) return "";
    const children = node.data.nodes || [];
    const childSigs = children.map(childId => {
      const child = query.node(childId).get();
      if (!child) return "";
      const typeValue = child.data.type;
      const type =
        typeof typeValue === "string"
          ? typeValue
          : (typeValue as any)?.resolvedName || child.data.displayName || "";
      return `${type}:${getStructureSignature(childId, query)}`;
    }).join(",");
    return `${children.length}:[${childSigs}]`;
  } catch {
    return "";
  }
}

function rebuildLinkedInstances(masterNodeId: string, query: any, actions: any) {
  const allNodes = query.getSerializedNodes();
  const instances: Array<{
    id: string;
    parentId: string;
    index: number;
    relationType: string;
    overrides?: Record<string, any>;
  }> = [];

  Object.entries(allNodes).forEach(([nodeId, serializedNode]: [string, any]) => {
    if (serializedNode.props?.belongsTo !== masterNodeId) return;
    try {
      const node = query.node(nodeId).get();
      if (!node) return;
      const parentId = node.data.parent;
      const parent = query.node(parentId).get();
      if (!parent) return;

      const rel = serializedNode.props.relationType;
      let overrides: Record<string, any> | undefined;

      if (rel === "style") {
        overrides = { root: serializedNode.props.root, className: serializedNode.props.className };
      } else if (rel === "content") {
        overrides = {};
        CONTENT_PROPS.forEach(key => {
          if (key in serializedNode.props) overrides![key] = serializedNode.props[key];
        });
      }

      instances.push({
        id: nodeId,
        parentId,
        index: parent.data.nodes.indexOf(nodeId),
        relationType: rel,
        overrides,
      });
    } catch {}
  });

  if (instances.length === 0) return;

  instances.forEach(instance => {
    try {
      const masterTree = query.node(masterNodeId).toNodeTree();
      const clonedTree = buildClonedTree({
        tree: masterTree,
        query,
        setProp: actions.setProp,
        createLinks: false,
      });

      actions.delete(instance.id);
      actions.addNodeTree(clonedTree, instance.parentId, instance.index);

      requestAnimationFrame(() => {
        setRecursiveBelongsTo(
          clonedTree.rootNodeId,
          masterNodeId,
          query,
          actions,
          (clonedNodeId, prop) => {
            prop.relationType = instance.relationType;
            if (instance.overrides && clonedNodeId === clonedTree.rootNodeId) {
              Object.assign(prop, instance.overrides);
            }
          }
        );
      });
    } catch (error) {
      console.error("Error rebuilding instance:", instance.id, error);
    }
  });
}
