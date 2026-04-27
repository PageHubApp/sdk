/**
 * ModifiersPickerPanel — heavy lazy chunk: FloatingPanel + ModifiersPickerBody.
 * Loaded on first open by ModifiersAddPicker.
 */
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { ModifiersPickerBody } from "./ModifiersPickerBody";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
  defaultWidth: number;
  defaultHeight: number;
}

export default function ModifiersPickerPanel({
  initialPosition,
  onClose,
  defaultWidth,
  defaultHeight,
}: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Modifiers"
      storageKey="modifiers-picker"
      autoSize={false}
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
      minWidth={280}
      maxWidth={420}
      minHeight={240}
      initialPosition={initialPosition}
      persistSize={false}
      zIndex={1100}
      scrollable
    >
      <ModifiersPickerBody />
    </FloatingPanel>
  );
}
