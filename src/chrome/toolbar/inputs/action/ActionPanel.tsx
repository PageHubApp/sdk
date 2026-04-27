/**
 * ActionPanel — heavy lazy chunk: FloatingPanel + full ActionInput body.
 * Loaded on first open by ActionInputPopover.
 */
import { FloatingPanel } from "../../../floating/FloatingPanel";
import ActionInput from "./ActionInput";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
  defaultWidth: number;
  defaultHeight: number;
}

export default function ActionPanel({
  initialPosition,
  onClose,
  defaultWidth,
  defaultHeight,
}: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Action"
      storageKey="action-input"
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
      minWidth={300}
      maxWidth={520}
      minHeight={240}
      initialPosition={initialPosition}
      persistSize={false}
      zIndex={1100}
      scrollable
    >
      <ActionInput />
    </FloatingPanel>
  );
}
