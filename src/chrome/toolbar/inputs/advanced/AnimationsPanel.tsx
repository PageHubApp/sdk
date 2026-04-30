/**
 * AnimationsPanel — heavy lazy chunk: FloatingPanel + full AnimationsInput body.
 * Loaded on first open by AnimationsInputPopover.
 */
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { AnimationsInput } from "./AnimationsInput";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../overlays/overlayZIndex";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}

export default function AnimationsPanel({ initialPosition, onClose }: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Animation"
      storageKey="animations-input"
      minWidth={320}
      maxWidth={520}
      minHeight={300}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <AnimationsInput />
    </FloatingPanel>
  );
}
