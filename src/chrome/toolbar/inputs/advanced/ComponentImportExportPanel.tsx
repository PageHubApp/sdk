/**
 * ComponentImportExportPanel — heavy lazy chunk: FloatingPanel hosting the
 * existing ComponentImportExport editor body unchanged.
 */
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { ComponentImportExport } from "./ComponentImportExport";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../overlays/overlayZIndex";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
  defaultWidth: number;
  defaultHeight: number;
}

export default function ComponentImportExportPanel({
  initialPosition,
  onClose,
  defaultWidth,
  defaultHeight,
}: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Import / Export"
      storageKey="component-import-export"
      autoSize={false}
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
      minWidth={340}
      maxWidth={640}
      minHeight={360}
      initialPosition={initialPosition}
      persistSize={false}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <ComponentImportExport />
    </FloatingPanel>
  );
}
