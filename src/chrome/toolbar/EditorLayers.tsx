/**
 * The layer tree on its own, without the docked panel's header and resize
 * handle (`SidebarLayersPanel` adds those around it). Fills its parent.
 */
import React from "react";
import { twMerge } from "tailwind-merge";
import { Layers } from "./dialogs/Layers/Layers";

export function EditorLayers({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={twMerge("bg-base-100 text-base-content flex-1 overflow-hidden", className)}>
      <Layers expandRootOnLoad={true} />
    </div>
  );
}
