import { TbMathFunction } from "react-icons/tb";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../popovers/overlayZIndex";
import { ToolbarItem } from "../../ToolbarItem";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}

export default function NumberSettingsPanel({ initialPosition, onClose }: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Bounds"
      icon={<TbMathFunction />}
      storageKey="ph-form-element-bounds"
      autoSize
      defaultWidth={260}
      minWidth={240}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <div className="flex flex-col gap-1.5">
        <ToolbarItem
          propKey="min"
          propType="component"
          type="text"
          label="Min"
          placeholder="Minimum value"
        />
        <ToolbarItem
          propKey="max"
          propType="component"
          type="text"
          label="Max"
          placeholder="Maximum value"
        />
        <ToolbarItem
          propKey="step"
          propType="component"
          type="text"
          label="Step"
          placeholder="Step value"
        />
      </div>
    </FloatingPanel>
  );
}
