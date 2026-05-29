import { NodeId, useEditor } from "@craftjs/core";
import { useCallback } from "react";
import { canMove } from "../utils";
import { sdkLog } from "../../../../../utils/logger";

interface UseLayerDragDropOptions {
  nodeId: NodeId;
  depth: number;
  hasChildren: boolean;
  setDraggedNode: (id: NodeId | null) => void;
  setDropIndicator: (
    indicator: { targetId: NodeId; position: "before" | "after" | "inside" } | null
  ) => void;
  state: {
    draggedNode: NodeId | null;
    dropIndicator: { targetId: NodeId; position: "before" | "after" | "inside" } | null;
  };
}

interface UseLayerDragDropResult {
  handleDragStart: (e: React.DragEvent) => void;
  handleDragEnd: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
}

export function useLayerDragDrop({
  nodeId,
  depth,
  hasChildren,
  setDraggedNode,
  setDropIndicator,
  state,
}: UseLayerDragDropOptions): UseLayerDragDropResult {
  const { actions, query } = useEditor();

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation();
      setDraggedNode(nodeId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", nodeId);
    },
    [nodeId, setDraggedNode]
  );

  const handleDragEnd = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation();

      if (state.dropIndicator && state.draggedNode) {
        const { targetId, position } = state.dropIndicator;

        try {
          const draggedNode = query.node(state.draggedNode).get();
          const targetNode = query.node(targetId).get();

          if (position === "inside") {
            if (!(targetNode.rules.canMoveIn as any)([draggedNode], targetNode)) {
              sdkLog.warn("Cannot drop inside - target rejects this node type");
              setDraggedNode(null);
              setDropIndicator(null);
              return;
            }

            const targetChildren = targetNode.data.nodes || [];
            actions.move(state.draggedNode, targetId, targetChildren.length);
          } else {
            const parentId = targetNode.data.parent;
            if (parentId) {
              const parentNode = query.node(parentId).get();

              if (!(parentNode.rules.canMoveIn as any)([draggedNode], parentNode)) {
                sdkLog.warn("Cannot drop - parent rejects this node type");
                setDraggedNode(null);
                setDropIndicator(null);
                return;
              }

              const siblings = parentNode.data.nodes || [];
              const targetIndex = siblings.indexOf(targetId);
              const newIndex = position === "after" ? targetIndex + 1 : targetIndex;
              actions.move(state.draggedNode, parentId, newIndex);
            }
          }
        } catch (error) {
          sdkLog.error("Error moving node:", error);
        }
      }

      setDraggedNode(null);
      setDropIndicator(null);
    },
    [state.dropIndicator, state.draggedNode, actions, query, setDraggedNode, setDropIndicator]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!state.draggedNode || state.draggedNode === nodeId) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const height = rect.height;

      const node = query.node(nodeId).get();
      const isCanvas = node?.data?.isCanvas || false;

      // Check if dragging to LEFT MARGIN (to move OUT of parent)
      const leftMargin = depth * 16 + 8;
      const isInLeftMargin = mouseX < leftMargin + 40;

      if (isInLeftMargin && depth > 0) {
        const parent = query.node(node.data.parent).get();
        if (parent && parent.data.parent) {
          const editorState = query.getSerializedNodes();
          const nodes = Object.keys(editorState).reduce(
            (acc, id) => {
              acc[id] = query.node(id).get();
              return acc;
            },
            {} as Record<NodeId, any>
          );

          if (canMove(state.draggedNode, node.data.parent, "after", nodes)) {
            setDropIndicator({
              targetId: node.data.parent,
              position: "after",
            });
            return;
          }
        }
      }

      let position: "before" | "after" | "inside";

      if (isCanvas && hasChildren) {
        if (mouseY < height * 0.2) {
          position = "before";
        } else if (mouseY > height * 0.8) {
          position = "after";
        } else {
          position = "inside";
        }
      } else if (isCanvas) {
        if (mouseY < height * 0.25) {
          position = "before";
        } else if (mouseY > height * 0.75) {
          position = "after";
        } else {
          position = "inside";
        }
      } else {
        position = mouseY < height / 2 ? "before" : "after";
      }

      // Validate move before showing indicator
      const editorState = query.getSerializedNodes();
      const nodes = Object.keys(editorState).reduce(
        (acc, id) => {
          acc[id] = query.node(id).get();
          return acc;
        },
        {} as Record<NodeId, any>
      );

      if (canMove(state.draggedNode, nodeId, position, nodes)) {
        setDropIndicator({ targetId: nodeId, position });
      }
    },
    [nodeId, depth, hasChildren, state.draggedNode, query, setDropIndicator]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation();
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (!e.currentTarget.contains(relatedTarget)) {
        setDropIndicator(null);
      }
    },
    [setDropIndicator]
  );

  return {
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
  };
}
