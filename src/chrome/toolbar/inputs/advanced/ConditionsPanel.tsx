/**
 * ConditionsPanel — heavy lazy chunk: FloatingPanel + full ConditionsInput body.
 * Loaded on first open by ConditionsInputPopover.
 */
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { ConditionsInput } from "./ConditionsInput";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
  defaultWidth: number;
  defaultHeight: number;
}

export default function ConditionsPanel({
  initialPosition,
  onClose,
  defaultWidth,
  defaultHeight,
}: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Conditions"
      storageKey="conditions-input"
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
      minWidth={340}
      maxWidth={560}
      minHeight={300}
      initialPosition={initialPosition}
      persistSize={false}
      zIndex={1100}
    >
      <div className="text-base-content flex flex-1 flex-col gap-2 overflow-y-auto p-3 text-xs">
        <ConditionsInput />
      </div>
    </FloatingPanel>
  );
}
