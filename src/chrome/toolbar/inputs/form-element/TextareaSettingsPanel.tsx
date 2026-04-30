import { TbTextResize } from "react-icons/tb";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../overlays/overlayZIndex";
import { ToolbarItem } from "../../ToolbarItem";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}

export default function TextareaSettingsPanel({ initialPosition, onClose }: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Textarea"
      icon={<TbTextResize />}
      storageKey="ph-form-element-textarea"
      autoSize
      defaultWidth={260}
      minWidth={240}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <div className="flex flex-col gap-1.5">
        <ToolbarItem
          propKey="rows"
          propType="component"
          type="number"
          label="Rows"
          placeholder="4"
          min={1}
          max={20}
        />
        <ToolbarItem
          propKey="cols"
          propType="component"
          type="number"
          label="Columns"
          placeholder="50"
          min={1}
          max={200}
        />
      </div>
    </FloatingPanel>
  );
}
