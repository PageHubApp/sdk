// @ts-nocheck
import { TailwindStyles } from "utils/tailwind";
import { ItemAdvanceToggle } from "../../Helpers/ItemSelector";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { SECTION_ICONS } from "../../UnifiedSettings/helpers";
import { ColorInput } from "../color/ColorInput";
import { IconDialogInput } from "./IconDialogInput";
import { ShadowInput } from "../color/ShadowInput";

interface IconInputProps {
  propKey?: string;
  propType?: string;
  label?: string;
  labelWidth?: string;
  inputWidth?: string;
  showIconOnly?: boolean;
  showPosition?: boolean;
  iconOnlyLabel?: string;
  positionLabel?: string;
  collapsible?: boolean;
}

export const IconInput = ({
  propKey = "icon",
  propType = "component",
  label = "Icon",
  labelWidth = "w-full",
  inputWidth = "w-fit",
  showIconOnly = true,
  showPosition = true,
  iconOnlyLabel = "Only Show Icon",
  positionLabel = "Position",
  collapsible,
}: IconInputProps) => {
  return (
    <ToolbarSection
      title={label}
      icon={SECTION_ICONS["Icon"]}
      collapsible={collapsible}
      footer={
        <ItemAdvanceToggle propKey="border" title="More icon properties">
          <ToolbarSection full={1} collapsible={false}>
            <ColorInput
              propKey="icon.color"
              propType="component"
              label="Color"
              prefix="text"
              inline
            />

            <ShadowInput propKey="icon.shadow" propType="component" />

            <ToolbarItem
              propKey="icon.gap"
              propType="component"
              type="select"
              label="Gap"
              max={TailwindStyles.gap.length - 1}
              min={0}
              valueLabels={TailwindStyles.gap}
            />
          </ToolbarSection>
        </ItemAdvanceToggle>
      }
    >
      <IconDialogInput
        propKey="icon.value"
        propType={propType}
        label="Image"
        labelWidth={labelWidth}
        inputWidth={inputWidth}
      />

      {showIconOnly && (
        <ToolbarItem
          propKey="icon.only"
          propType={propType}
          type="checkbox"
          label={iconOnlyLabel}
          on={true}
          labelHide
          labelWidth="w-full"
        />
      )}

      {showPosition && (
        <ToolbarItem
          propKey="icon.position"
          propType={propType}
          type="select"
          label={positionLabel}
        >
          <option value="left">Left</option>
          <option value="right">Right</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
        </ToolbarItem>
      )}

      <ToolbarItem
        propKey="icon.size"
        propType="component"
        type="select"
        label="Size"
        max={TailwindStyles.allWidths.length - 1}
        min={0}
        valueLabels={TailwindStyles.allWidths}
      />
    </ToolbarSection>
  );
};

export default IconInput;
