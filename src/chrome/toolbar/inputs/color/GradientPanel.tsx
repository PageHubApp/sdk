/**
 * GradientPanel — heavy lazy chunk: FloatingPanel + full GradientInput body.
 * Loaded on first open by GradientInputPopover.
 */
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { GradientInput } from "./GradientInput";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
  defaultWidth: number;
  defaultHeight: number;
}

export default function GradientPanel({
  initialPosition,
  onClose,
  defaultWidth,
  defaultHeight,
}: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Gradient"
      storageKey="gradient-input"
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
      minWidth={280}
      maxWidth={480}
      minHeight={320}
      initialPosition={initialPosition}
      persistSize={false}
      zIndex={1100}
    >
      <div className="text-base-content flex flex-1 flex-col gap-2 overflow-y-auto p-3 text-xs">
        <GradientInput />
      </div>
    </FloatingPanel>
  );
}
