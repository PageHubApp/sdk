import { NodeId, useEditor } from "@craftjs/core";
import React, { useEffect, useState } from "react";
import { LayerHeader } from "./LayerHeader";
import { useLayerManager } from "./LayerManager";

interface LayerNodeProps {
  nodeId: NodeId;
  depth: number;
}

export function LayerNode({ nodeId, depth }: LayerNodeProps) {
  const { state, expandToNode } = useLayerManager();
  const [isRegistered, setIsRegistered] = useState(false);

  const { exists, children, node, selectedId, allNodes } = useEditor((editorState, query) => {
    const exists = !!editorState.nodes[nodeId];
    const node = exists ? editorState.nodes[nodeId] : null;
    const children = exists ? node?.data?.nodes || [] : [];
    const selectedId = query.getEvent("selected").first();

    return {
      exists,
      children,
      node,
      selectedId,
      allNodes: editorState.nodes,
    };
  });

  useEffect(() => {
    if (exists) {
      setIsRegistered(true);
    }
  }, [exists]);

  // Auto-expand to selected node
  useEffect(() => {
    if (selectedId && allNodes) {
      expandToNode(selectedId, allNodes);
    }
  }, [selectedId, allNodes, expandToNode]);

  if (!exists || !isRegistered || !node) {
    return null;
  }

  const isExpanded = state.expanded[nodeId] || false;
  const hasChildren = children.length > 0;

  // Hide transparent wrapper components from layers panel (but show their children)
  const isHiddenInLayers = node?.data?.custom?.hiddenInLayers === true;

  // If hidden, render its children directly without showing the wrapper itself
  if (isHiddenInLayers && hasChildren) {
    return (
      <>
        {children.map(childId => (
          <LayerNode key={childId} nodeId={childId} depth={depth} />
        ))}
      </>
    );
  }

  // If hidden wrapper with no children, hide it completely
  if (isHiddenInLayers) {
    return null;
  }

  // Sealed components hide their children from the layer tree
  const isSealed = node?.data?.custom?.sealed === true;

  return (
    <div className="craft-layer-node" data-node-id={nodeId}>
      <LayerHeader
        nodeId={nodeId}
        depth={depth}
        hasChildren={isSealed ? false : hasChildren}
        isExpanded={isSealed ? false : isExpanded}
      />

      {/* Render children recursively if expanded (sealed nodes hide children) */}
      {hasChildren && isExpanded && !isSealed && (
        <div className="craft-layer-children">
          {children.map(childId => (
            <LayerNode key={childId} nodeId={childId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
