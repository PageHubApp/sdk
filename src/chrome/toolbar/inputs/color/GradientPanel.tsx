/**
 * GradientPanel — heavy lazy chunk: FloatingPanel + full GradientInput body.
 * Loaded on first open by GradientInputPopover.
 */
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { GradientInput } from "./GradientInput";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../overlays/overlayZIndex";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}

export default function GradientPanel({ initialPosition, onClose }: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Gradient"
      storageKey="gradient-input"
      minWidth={280}
      maxWidth={480}
      minHeight={320}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <GradientInput />
    </FloatingPanel>
  );
}
