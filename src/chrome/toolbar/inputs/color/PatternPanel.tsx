/**
 * PatternPanel — heavy lazy chunk: FloatingPanel + full PatternPanelBody.
 * Loaded on first open by PatternInputPopover.
 */
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { PatternPanelBody } from "./PatternPanelBody";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
  defaultWidth: number;
  defaultHeight: number;
}

export default function PatternPanel({
  initialPosition,
  onClose,
  defaultWidth,
  defaultHeight,
}: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Pattern"
      storageKey="pattern-input"
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
      minWidth={260}
      maxWidth={420}
      minHeight={200}
      initialPosition={initialPosition}
      persistSize={false}
      zIndex={1100}
      scrollable
    >
      <PatternPanelBody />
    </FloatingPanel>
  );
}
