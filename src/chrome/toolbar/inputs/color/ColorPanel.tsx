/**
 * ColorPanel — heavy lazy chunk: FloatingPanel + ColorPanelBody. Loaded on
 * first open by ColorInputPopover. Mirrors GradientPanel.
 */
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { ColorPanelBody } from "./ColorPanelBody";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
  defaultWidth: number;
  defaultHeight: number;
  value: string;
  onChange: (data: { type: "palette" | "hex" | "rgb" | "class"; value: any }) => void;
  onClear?: () => void;
}

export default function ColorPanel({
  initialPosition,
  onClose,
  defaultWidth,
  defaultHeight,
  value,
  onChange,
  onClear,
}: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Color"
      storageKey="color-input"
      autoSize={false}
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
      minWidth={260}
      maxWidth={400}
      minHeight={420}
      initialPosition={initialPosition}
      persistSize={false}
      zIndex={1100}
      scrollable
    >
      <ColorPanelBody value={value} onChange={onChange} onClear={onClear} />
    </FloatingPanel>
  );
}
