/**
 * GradientPanel — heavy lazy chunk: FloatingPanel + full GradientInput body.
 * Loaded on first open by GradientInputPopover.
 */
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { GradientInput } from "./GradientInput";

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
      zIndex={1100}
      scrollable
    >
      <GradientInput />
    </FloatingPanel>
  );
}
