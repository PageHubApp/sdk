import { NodeId, useEditor } from "@craftjs/core";
import { useCallback } from "react";
import {
  getSiblingMoveState,
  moveNodeDown,
  moveNodeIn,
  moveNodeOut,
  moveNodeUp,
} from "../siblingMoveOps";

interface UseLayerMoveOptions {
  nodeId: NodeId;
}

interface UseLayerMoveResult {
  handleMoveUp: (e: React.MouseEvent) => void;
  handleMoveDown: (e: React.MouseEvent) => void;
  handleMoveOut: (e: React.MouseEvent) => void;
  handleMoveIn: (e: React.MouseEvent) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canMoveOut: boolean;
  canMoveIn: boolean;
}

export function useLayerMove({ nodeId }: UseLayerMoveOptions): UseLayerMoveResult {
  const { actions, query } = useEditor();

  const handleMoveUp = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      moveNodeUp(query, actions, nodeId);
    },
    [nodeId, query, actions]
  );

  const handleMoveDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      moveNodeDown(query, actions, nodeId);
    },
    [nodeId, query, actions]
  );

  const handleMoveOut = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      moveNodeOut(query, actions, nodeId);
    },
    [nodeId, query, actions]
  );

  const handleMoveIn = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      moveNodeIn(query, actions, nodeId);
    },
    [nodeId, query, actions]
  );

  const { canMoveUp, canMoveDown, canMoveOut, canMoveIn } = getSiblingMoveState(query, nodeId);

  return {
    handleMoveUp,
    handleMoveDown,
    handleMoveOut,
    handleMoveIn,
    canMoveUp,
    canMoveDown,
    canMoveOut,
    canMoveIn,
  };
}
