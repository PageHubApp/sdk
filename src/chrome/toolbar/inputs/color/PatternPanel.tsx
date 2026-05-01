/**
 * PatternPanel — heavy lazy chunk: FloatingPanel + full PatternPanelBody.
 * Loaded on first open by PatternInputPopover.
 */
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { PatternPanelBody } from "./PatternPanelBody";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../popovers/overlayZIndex";

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
      autoSize={false}
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
      minWidth={260}
      maxWidth={420}
      minHeight={200}
      initialPosition={initialPosition}
      persistSize={false}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <PatternPanelBody />
    </FloatingPanel>
  );
}
