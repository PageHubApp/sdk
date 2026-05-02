import { ROOT_NODE } from "../utils/rootNode";
import { useEditor, useNode } from "@craftjs/core";
import { setRecursiveBelongsTo } from "@/utils/component/componentUtils";
import { useEffect, useRef } from "react";
import { useAtomValue } from "@zedux/react";
import { ComponentsAtom } from "../utils/atoms";
import { buildClonedTree } from "./cloneTree";

// Track which loaders are currently processing to prevent duplicates
const processingLoaders = new Set();

// This component gets rendered when you drag and drop
// It immediately replaces itself with the actual saved component tree
export const SavedComponentLoader = ({ componentData }) => {
  const { id } = useNode(node => ({ id: node.id }));
  const { actions, query } = useEditor();
  const components = useAtomValue(ComponentsAtom);
  const processedRef = useRef(false);

  useEffect(() => {
    // Only process once per instance
    if (processedRef.current) return;
    if (!componentData) return;

    // Check if this loader is already processing globally
    if (processingLoaders.has(id)) return;

    // Check if this loader node exists
    const loaderNode = query.node(id).get();
    if (!loaderNode) return;

    // Mark as processed immediately to prevent re-runs
    processedRef.current = true;
    processingLoaders.add(id);

    try {
      // Parse the serialized nodes
      const serializedNodes = JSON.parse(componentData.nodes);

      // Convert serialized nodes back to node format
      const nodeEntries = Object.entries(serializedNodes).map(
        ([nodeId, serializedNode]: [string, any]) => {
          return [nodeId, query.parseSerializedNode(serializedNode).toNode()];
        }
      );

      const nodes = Object.fromEntries(nodeEntries);

      const tree = {
        rootNodeId: componentData.rootNodeId,
        nodes: nodes,
      };

      // Check if this component exists in ComponentsAtom (meaning a master exists)
      const savedComponentName = componentData.name;
      const existingComponent = components?.find(c => c.name === savedComponentName);

      let clonedTree;
      if (existingComponent) {
        // Master component exists - create a linked clone from it
        const masterNodeId = existingComponent.rootNodeId;
        const masterNode = query.node(masterNodeId).get();

        if (masterNode) {
          // Master node exists, create a linked clone to it
          const masterTree = query.node(masterNodeId).toNodeTree();

          clonedTree = buildClonedTree({
            tree: masterTree,
            query,
            setProp: actions.setProp,
            createLinks: true,
          });
        } else {
          // Master was deleted somehow, treat as first instance
          clonedTree = buildClonedTree({
            tree,
            query,
            setProp: actions.setProp,
            createLinks: false,
          });
        }
      } else {
        // No master component exists - this shouldn't happen with our new system
        // but handle it gracefully by creating a non-linked instance
        clonedTree = buildClonedTree({
          tree,
          query,
          setProp: actions.setProp,
          createLinks: false,
        });
      }

      // Get the parent and position of this loader node
      const parentId = loaderNode.data.parent;
      if (!parentId) return;

      const parent = query.node(parentId).get();
      if (!parent) return;

      const indexInParent = parent.data.nodes.indexOf(id);

      // Delete the loader node FIRST to prevent re-renders
      actions.delete(id);

      // Add the entire tree at once
      actions.addNodeTree(clonedTree, parentId, indexInParent);

      // Set belongsTo relationship AFTER the tree is added
      setTimeout(() => {
        if (!query.node(clonedTree.rootNodeId).get()) return;

        if (clonedTree.originalRootId && query.node(clonedTree.originalRootId).get()) {
          setRecursiveBelongsTo(clonedTree.rootNodeId, clonedTree.originalRootId, query, actions);
        }
        // If no originalRootId, it's not linked (shouldn't happen with our new system)
      }, 50);

      // Clean up the global processing set
      setTimeout(() => {
        processingLoaders.delete(id);
      }, 100);
    } catch (error) {
      console.error("Error loading saved component:", error);
      // Clean up on error
      processingLoaders.delete(id);
      if (query.node(id).get()) {
        actions.delete(id);
      }
    }

    // Cleanup function
    return () => {
      processingLoaders.delete(id);
    };
  }, [componentData, actions, query, id, components]);

  // Show a placeholder while loading
  return <div className="text-neutral-content p-3">Loading component...</div>;
};

// This needs to have craft config for CraftJS to recognize it
SavedComponentLoader.craft = {
  displayName: "Component Loader",
};
