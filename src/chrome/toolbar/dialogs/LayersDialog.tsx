import React from "react";
import { TbLayoutGrid } from "react-icons/tb";
import { useEditorSidebarDockLeft } from "../../../utils/atoms";
import { FloatingPanel } from "../../floating/FloatingPanel";
import { Layers } from "./Layers/Layers";
import { OVERLAY_Z_MODAL } from "../../popovers/overlayZIndex";

interface LayersDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LayersDialog({ isOpen, onClose }: LayersDialogProps) {
  const toolbarDockedLeft = useEditorSidebarDockLeft();
  const dockSide = toolbarDockedLeft ? "left" : "right";

  return (
    <FloatingPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Layers"
      icon={<TbLayoutGrid className="size-3.5" />}
      storageKey="layers-dialog"
      autoSize={false}
      defaultWidth={340}
      defaultHeight={500}
      minWidth={280}
      maxWidth={600}
      minHeight={300}
      maxHeight={700}
      dockToEdge={dockSide}
      closeButtonSide="right"
      zIndex={OVERLAY_Z_MODAL}
    >
      <div className="bg-base-100 text-base-content flex min-h-0 flex-1 flex-col overflow-hidden">
        <Layers expandRootOnLoad={true} />
      </div>
    </FloatingPanel>
  );
}
