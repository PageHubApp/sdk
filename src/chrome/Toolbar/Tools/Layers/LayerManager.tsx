// @ts-nocheck
import { NodeId } from "@craftjs/core";
import React, { createContext, ReactNode, useCallback, useContext, useState } from "react";

export interface LayerState {
  expanded: Record<NodeId, boolean>;
  draggedNode: NodeId | null;
  dropIndicator: {
    targetId: NodeId;
    position: "before" | "after" | "inside";
  } | null;
}

interface LayerManagerContextValue {
  state: LayerState;
  toggleExpanded: (nodeId: NodeId) => void;
  setExpanded: (nodeId: NodeId, expanded: boolean) => void;
  expandToNode: (nodeId: NodeId, nodes: Record<NodeId, any>) => void;
  setDraggedNode: (nodeId: NodeId | null) => void;
  setDropIndicator: (indicator: LayerState["dropIndicator"]) => void;
}

const LayerManagerContext = createContext<LayerManagerContextValue | null>(null);

export const useLayerManager = () => {
  const context = useContext(LayerManagerContext);
  if (!context) {
    throw new Error("useLayerManager must be used within LayerManagerProvider");
  }
  return context;
};

interface LayerManagerProviderProps {
  children: ReactNode;
  expandRootOnLoad?: boolean;
}

export const LayerManagerProvider: React.FC<LayerManagerProviderProps> = ({
  children,
  expandRootOnLoad = true,
}) => {
  const [state, setState] = useState<LayerState>({
    expanded: expandRootOnLoad ? { ROOT: true } : {},
    draggedNode: null,
    dropIndicator: null,
  });

  const toggleExpanded = useCallback((nodeId: NodeId) => {
    setState(prev => ({
      ...prev,
      expanded: {
        ...prev.expanded,
        [nodeId]: !prev.expanded[nodeId],
      },
    }));
  }, []);

  const expandToNode = useCallback((nodeId: NodeId, nodes: Record<NodeId, any>) => {
    // Expand all ancestors of this node
    const ancestorsToExpand: Record<NodeId, boolean> = {};
    let currentId = nodes[nodeId]?.data?.parent;

    while (currentId && currentId !== "ROOT") {
      ancestorsToExpand[currentId] = true;
      currentId = nodes[currentId]?.data?.parent;
    }

    if (Object.keys(ancestorsToExpand).length > 0) {
      setState(prev => ({
        ...prev,
        expanded: {
          ...prev.expanded,
          ...ancestorsToExpand,
        },
      }));
    }
  }, []);

  const setExpanded = useCallback((nodeId: NodeId, expanded: boolean) => {
    setState(prev => ({
      ...prev,
      expanded: {
        ...prev.expanded,
        [nodeId]: expanded,
      },
    }));
  }, []);

  const setDraggedNode = useCallback((nodeId: NodeId | null) => {
    setState(prev => ({
      ...prev,
      draggedNode: nodeId,
    }));
  }, []);

  const setDropIndicator = useCallback((indicator: LayerState["dropIndicator"]) => {
    setState(prev => ({
      ...prev,
      dropIndicator: indicator,
    }));
  }, []);

  const value: LayerManagerContextValue = {
    state,
    toggleExpanded,
    setExpanded,
    expandToNode,
    setDraggedNode,
    setDropIndicator,
  };

  return <LayerManagerContext.Provider value={value}>{children}</LayerManagerContext.Provider>;
};
