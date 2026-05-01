import { TbAdjustments } from "react-icons/tb";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../popovers/overlayZIndex";
import { ToolbarItem } from "../../ToolbarItem";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}

export default function PropertiesPanel({ initialPosition, onClose }: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Properties"
      icon={<TbAdjustments />}
      storageKey="ph-form-element-properties"
      autoSize
      defaultWidth={280}
      minWidth={260}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <div className="flex flex-col gap-1.5">
        <ToolbarItem
          propKey="required"
          propType="component"
          type="checkbox"
          label="Required"
          on={true}
        />
        <ToolbarItem
          propKey="disabled"
          propType="component"
          type="checkbox"
          label="Disabled"
          on={true}
        />
        <ToolbarItem
          propKey="readOnly"
          propType="component"
          type="checkbox"
          label="Read Only"
          on={true}
        />
        <ToolbarItem
          propKey="autoComplete"
          propType="component"
          type="text"
          label="Autocomplete"
          placeholder="off / email / name / …"
        />
        <ToolbarItem
          propKey="defaultValue"
          propType="component"
          type="text"
          label="Default"
          placeholder="Initial value"
        />
      </div>
    </FloatingPanel>
  );
}
