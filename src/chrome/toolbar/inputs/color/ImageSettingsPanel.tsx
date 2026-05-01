/**
 * ImageSettingsPanel — heavy lazy chunk for the Image Settings cog. Mirrors
 * `ContainerOverflowSectionPanel` exactly: FloatingPanel + a focused mainTab
 * body component (`ImageSettingsSection`).
 */
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { ImageSettingsSection } from "../../inspector/mainTabs/ImageSettingsSection";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../popovers/overlayZIndex";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}

export default function ImageSettingsPanel({ initialPosition, onClose }: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Image Settings"
      storageKey="image-settings"
      minWidth={300}
      maxWidth={520}
      minHeight={320}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <ImageSettingsSection />
    </FloatingPanel>
  );
}
