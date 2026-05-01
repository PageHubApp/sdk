import { TbShieldCheck } from "react-icons/tb";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../popovers/overlayZIndex";
import { ToolbarItem } from "../../ToolbarItem";

interface PanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}

export default function ValidationPanel({ initialPosition, onClose }: PanelProps) {
  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Validation"
      icon={<TbShieldCheck />}
      storageKey="ph-form-element-validation"
      autoSize
      defaultWidth={320}
      minWidth={280}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <div className="flex flex-col gap-1.5">
        <ToolbarItem
          propKey="pattern"
          propType="component"
          type="text"
          label="Pattern"
          placeholder="Regex (e.g. [A-Za-z]+)"
        />
        <ToolbarItem
          propKey="errorMessage"
          propType="component"
          type="text"
          label="Error"
          placeholder="Please enter a valid value"
        />
        <ToolbarItem
          propKey="label"
          propType="component"
          type="text"
          label="A11y label"
          placeholder="Field label"
        />
      </div>
    </FloatingPanel>
  );
}
