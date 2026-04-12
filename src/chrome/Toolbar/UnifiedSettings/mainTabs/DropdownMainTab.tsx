import { useNode } from "@craftjs/core";
import { SettingsAiSlot } from "../../../SettingsAiSlot";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, renderAdvancedComponentSlots, SECTION_ICONS } from "../helpers";

export const DropdownMainTab = () => {
  const { props } = useNode(node => ({ props: node.data.props }));

  return renderComponentSlots({
    Content: (
      <ToolbarSection
        title="Content"
        icon={SECTION_ICONS["Content"]}
        help="Dropdown trigger and position settings."
      >
        <ToolbarItem propKey="trigger" propType="component" type="select" label="Trigger">
          <option value="click">Click</option>
          <option value="hover">Hover</option>
        </ToolbarItem>

        <ToolbarItem propKey="position" propType="component" type="select" label="Position">
          <option value="bottom-start">Below Left</option>
          <option value="bottom-end">Below Right</option>
          <option value="top-start">Above Left</option>
          <option value="top-end">Above Right</option>
        </ToolbarItem>
        <SettingsAiSlot />
      </ToolbarSection>
    ),
  });
};

export const DropdownMainTabAdvanced = () => {
  return renderAdvancedComponentSlots({});
};
