/**
 * SaveModifierPanel — heavy lazy chunk: FloatingPanel + SaveModifierPanelBody.
 * Loaded on first open by SaveAsModifier (the picker footer trigger).
 */
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { SaveModifierPanelBody } from "./SaveModifierPanelBody";
import { OVERLAY_Z_FLOATING_PANEL_DROPDOWN } from "../../../popovers/overlayZIndex";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}

export default function SaveModifierPanel({ initialPosition, onClose }: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Save as modifier"
      storageKey="save-modifier-panel"
      minWidth={280}
      maxWidth={420}
      minHeight={320}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL_DROPDOWN}
      scrollable
    >
      <SaveModifierPanelBody onClose={onClose} />
    </FloatingPanel>
  );
}
