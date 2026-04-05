// @ts-nocheck
/**
 * Hook to sync linked component instances when master components change
 */
import { useEditor } from "@craftjs/core";
import { useEffect, useRef } from "react";
import { useAtomValue } from "@zedux/react";
import { ComponentsAtom } from "utils/lib";
import { buildClonedTree } from "../Viewport/lib";
import { setRecursiveBelongsTo } from "../componentUtils";

export const useComponentSync = () => {
  const { query, actions } = useEditor();
  const components = useAtomValue(ComponentsAtom);
  const lastStructureRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!components || components.length === 0) return;

    // Check each master component for structural changes
    components.forEach(component => {
      const masterNodeId = component.rootNodeId;
      const masterNode = query.node(masterNodeId).get();

      if (!masterNode) return;

      // Get current structure signature (children IDs + their types)
      const getStructureSignature = (nodeId: string): string => {
        const node = query.node(nodeId).get();
        if (!node) return "";

        const children = node.data.nodes || [];
        const childSignatures = children
          .map(childId => {
            const child = query.node(childId).get();
            if (!child) return "";
            // Handle type being either a string or an object with resolvedName
            const typeValue = child.data.type;
            const type =
              typeof typeValue === "string"
                ? typeValue
                : (typeValue as any)?.resolvedName || child.data.displayName || "";
            const childStructure = getStructureSignature(childId);
            return `${type}:${childStructure}`;
          })
          .join(",");

        return `${children.length}:[${childSignatures}]`;
      };

      const currentSignature = getStructureSignature(masterNodeId);
      const lastSignature = lastStructureRef.current.get(masterNodeId);

      // If structure changed, rebuild all linked instances
      if (lastSignature && lastSignature !== currentSignature) {
        console.log("🔄 Master component structure changed:", component.name);
        rebuildLinkedInstances(masterNodeId);
      }

      // Update stored signature
      lastStructureRef.current.set(masterNodeId, currentSignature);
    });
  }, [components, query, actions]);

  const rebuildLinkedInstances = (masterNodeId: string) => {
    // Find all nodes that belong to this master
    const allNodes = query.getSerializedNodes();
    const linkedInstances: Array<{
      id: string;
      parentId: string;
      index: number;
      relationType: string;
      customStyles?: any;
    }> = [];

    Object.entries(allNodes).forEach(([nodeId, serializedNode]: [string, any]) => {
      if (serializedNode.props?.belongsTo === masterNodeId) {
        const node = query.node(nodeId).get();
        if (!node) return;

        const parentId = node.data.parent;
        const parent = query.node(parentId).get();
        if (!parent) return;

        const index = parent.data.nodes.indexOf(nodeId);

        linkedInstances.push({
          id: nodeId,
          parentId,
          index,
          relationType: serializedNode.props.relationType,
          customStyles:
            serializedNode.props.relationType === "style"
              ? {
                  root: serializedNode.props.root,
                  className: serializedNode.props.className,
                }
              : undefined,
        });
      }
    });

    if (linkedInstances.length === 0) return;

    console.log(`🔄 Rebuilding ${linkedInstances.length} linked instances...`);

    // Rebuild each instance
    linkedInstances.forEach(instance => {
      try {
        // Get the master's current tree
        const masterTree = query.node(masterNodeId).toNodeTree();

        // Build a fresh clone
        const clonedTree = buildClonedTree({
          tree: masterTree,
          query,
          setProp: actions.setProp,
          createLinks: false, // Don't create hasMany links during rebuild
        });

        // Delete the old instance
        actions.delete(instance.id);

        // Add the new clone at the same position
        actions.addNodeTree(clonedTree, instance.parentId, instance.index);

        // Set belongsTo on all nodes in the new tree
        setTimeout(() => {
          setRecursiveBelongsTo(
            clonedTree.rootNodeId,
            masterNodeId,
            query,
            actions,
            (clonedNodeId, prop) => {
              prop.relationType = instance.relationType;

              // For style-only instances, restore custom styles
              if (instance.customStyles && clonedNodeId === clonedTree.rootNodeId) {
                prop.root = instance.customStyles.root;
                prop.className = instance.customStyles.className;
              }
            }
          );
        }, 50);

        console.log("✅ Rebuilt instance:", instance.id, "→", clonedTree.rootNodeId);
      } catch (error) {
        console.error("❌ Error rebuilding instance:", instance.id, error);
      }
    });
  };
};
