/**
 * AnimationsPanel — heavy lazy chunk: FloatingPanel + full AnimationsInput body.
 * Loaded on first open by AnimationsInputPopover.
 */
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { AnimationsInput } from "./AnimationsInput";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
  defaultWidth: number;
  defaultHeight: number;
}

export default function AnimationsPanel({
  initialPosition,
  onClose,
  defaultWidth,
  defaultHeight,
}: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Animation"
      storageKey="animations-input"
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
      minWidth={320}
      maxWidth={520}
      minHeight={300}
      initialPosition={initialPosition}
      persistSize={false}
      zIndex={1100}
    >
      <div className="text-base-content flex flex-1 flex-col gap-2 overflow-y-auto p-3 text-xs">
        <AnimationsInput />
      </div>
    </FloatingPanel>
  );
}
