// @ts-nocheck
import { ROOT_NODE } from "@craftjs/core";
import React from "react";
import { AutoHideScrollbar } from "components/layout";
import { LayerManagerProvider } from "./LayerManager";
import { LayerNode } from "./LayerNode";

interface LayersProps {
  expandRootOnLoad?: boolean;
}

export const Layers: React.FC<LayersProps> = ({ expandRootOnLoad = true }) => {
  return (
    <LayerManagerProvider expandRootOnLoad={expandRootOnLoad}>
      <AutoHideScrollbar className="craft-layers-container size-full">
        <div className="inline-block min-w-full">
          <LayerNode nodeId={ROOT_NODE} depth={0} />
        </div>
      </AutoHideScrollbar>
    </LayerManagerProvider>
  );
};
