/**
 * ContainerOverflowSectionPanel — heavy lazy chunk: FloatingPanel hosting the
 * existing ContainerOverflowSection editor body unchanged.
 */
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { ContainerOverflowSection } from "../../unified-settings/mainTabs/ContainerOverflowSection";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../overlays/overlayZIndex";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}

export default function ContainerOverflowSectionPanel({ initialPosition, onClose }: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Scroll Behavior"
      storageKey="container-overflow"
      minWidth={300}
      maxWidth={520}
      minHeight={320}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <ContainerOverflowSection />
    </FloatingPanel>
  );
}
