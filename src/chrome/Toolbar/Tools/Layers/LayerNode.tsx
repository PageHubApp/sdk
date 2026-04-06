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

  // Hide Background component from layers panel (but show its children)
  const displayName =
    node?.data?.custom?.displayName || node?.data?.displayName || node?.data?.name || "";
  const isBackground = displayName === "Background";

  // If this is the Background node, render its children directly without showing the Background itself
  if (isBackground && hasChildren) {
    return (
      <>
        {children.map(childId => (
          <LayerNode key={childId} nodeId={childId} depth={depth} />
        ))}
      </>
    );
  }

  // If it's Background with no children, hide it completely
  if (isBackground) {
    return null;
  }

  return (
    <div className="craft-layer-node" data-node-id={nodeId}>
      <LayerHeader
        nodeId={nodeId}
        depth={depth}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
      />

      {/* Render children recursively if expanded */}
      {hasChildren && isExpanded && (
        <div className="craft-layer-children">
          {children.map(childId => (
            <LayerNode key={childId} nodeId={childId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
