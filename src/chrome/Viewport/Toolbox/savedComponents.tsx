// @ts-nocheck
import { Element, ROOT_NODE, useEditor, useNode } from "@craftjs/core";
import { setRecursiveBelongsTo } from "../../componentUtils";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef } from "react";
import { TbBoxModel2, TbTrash } from "react-icons/tb";
import { useAtomValue } from "@zedux/react";
import { useSetAtomState } from "../../../utils/atoms";
import { ComponentsAtom } from "utils/lib";
import { buildClonedTree } from "../lib";
import { SelectedNodeAtom } from "./lib";

import generate from "../../../utils/data/nameGenerator";

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
  return <div className="p-3 text-muted-foreground">Loading component...</div>;
};

// This needs to have craft config for CraftJS to recognize it
SavedComponentLoader.craft = {
  displayName: "Component Loader",
};

export const RenderSavedComponent = ({ componentData }) => {
  const { actions, query } = useEditor();
  const {
    enabled,
    connectors: { create },
  } = useEditor(state => ({
    enabled: state.options.enabled,
  }));

  const setComponents = useSetAtomState(ComponentsAtom);
  const components = useAtomValue(ComponentsAtom);
  const selectedNode = useAtomValue(SelectedNodeAtom);

  // Use the component name from componentData directly
  const componentName = componentData.name || "Unnamed Component";

  // Create the draggable element
  const tool = (
    <Element
      canvas
      is={SavedComponentLoader}
      componentData={componentData}
      custom={{ displayName: componentName }}
    />
  );

  // Double-click handler
  const handleDoubleClick = useCallback(() => {
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

      // Add to selected node or root
      const targetId = selectedNode?.id || Object.keys(query.getSerializedNodes())[0];
      const targetNode = query.node(targetId).get();
      const targetIndex = targetNode.data.nodes.length;

      // Add the entire tree at once
      actions.addNodeTree(clonedTree, targetId, targetIndex);

      // Set belongsTo relationship AFTER the tree is added
      setTimeout(() => {
        if (!query.node(clonedTree.rootNodeId).get()) return;

        if (clonedTree.originalRootId && query.node(clonedTree.originalRootId).get()) {
          setRecursiveBelongsTo(clonedTree.rootNodeId, clonedTree.originalRootId, query, actions);
        }
        // If no originalRootId, it's not linked (shouldn't happen with our new system)
      }, 50);
    } catch (error) {
      console.error("Error adding saved component:", error);
    }
  }, [actions, query, componentData, selectedNode, components]);

  const handleDelete = e => {
    e.stopPropagation();
    e.preventDefault();

    // Remove from Background node
    const rootNode = query.node(ROOT_NODE).get();
    const backgroundId = rootNode?.data?.nodes?.[0];

    if (backgroundId) {
      actions.setProp(backgroundId, prop => {
        prop.savedComponents = (prop.savedComponents || []).filter(
          c => c.rootNodeId !== componentData.rootNodeId
        );
      });

      // Update the local state
      setComponents(prev => prev.filter(c => c.rootNodeId !== componentData.rootNodeId));
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.9 }}
      ref={(ref: any) => ref && create(ref, tool)}
      onDoubleClick={handleDoubleClick}
      className="pointer-events-auto w-full cursor-move"
    >
      <div className="pointer-events-none relative flex min-h-[80px] w-full flex-col items-center justify-center gap-2 rounded-lg border p-3 text-muted-foreground transition-colors hover:bg-muted">
        <TbBoxModel2 className="text-2xl" />
        <span className="text-center text-xs">{componentName}</span>
        <button
          onClick={handleDelete}
          onMouseDown={e => e.stopPropagation()}
          className="pointer-events-auto absolute right-1 top-1 z-10 p-1 text-destructive hover:text-destructive"
          aria-label="Delete component"
        >
          <TbTrash className="text-sm" />
        </button>
      </div>
    </motion.div>
  );
};

export const SavedComponentsToolbox = components => ({
  title: "My Components",
  content: components
    .filter(component => !component.isSection) // Exclude sections
    .map((component, index) => <RenderSavedComponent key={index} componentData={component} />),
});
