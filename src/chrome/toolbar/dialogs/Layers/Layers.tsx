import { ROOT_NODE } from "@craftjs/utils";
import React from "react";
import { AutoHideScrollbar } from "@/chrome/primitives/layout";
import { LayerManagerProvider } from "./LayerManager";
import { LayerNode } from "./LayerNode";

interface LayersProps {
  expandRootOnLoad?: boolean;
}

export function Layers({ expandRootOnLoad = true }: LayersProps) {
  return (
    <LayerManagerProvider expandRootOnLoad={expandRootOnLoad}>
      <AutoHideScrollbar className="craft-layers-container size-full">
        <div className="inline-block min-w-full">
          <LayerNode nodeId={ROOT_NODE} depth={0} />
        </div>
      </AutoHideScrollbar>
    </LayerManagerProvider>
  );
}
