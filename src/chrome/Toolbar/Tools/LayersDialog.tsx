import React from "react";
import { TbLayoutGrid } from "react-icons/tb";
import { Layers } from "./Layers";
import { MoveableDialog } from "./MoveableDialog";

interface LayersDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LayersDialog({ isOpen, onClose }: LayersDialogProps) {
  return (
    <MoveableDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Layers"
      icon={<TbLayoutGrid />}
      width="fit-content"
      height="600px"
      initialPosition={{ x: 100, y: 100 }}
    >
      <div className="flex h-full flex-col" style={{ minWidth: "320px", maxWidth: "600px" }}>
        {/* Layers Panel */}
        <div className="bg-base-100 text-base-content flex-1 overflow-auto">
          <Layers expandRootOnLoad={true} />
        </div>
      </div>
    </MoveableDialog>
  );
}
