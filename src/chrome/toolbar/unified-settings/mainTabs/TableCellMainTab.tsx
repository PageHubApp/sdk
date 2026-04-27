import { useNode } from "@craftjs/core";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const TableCellMainTab = () => {
  const { props } = useNode(node => ({ props: node.data?.props }));

  return renderComponentSlots({
    Content: (
      <ToolbarSection collapsible={false}>
        <ToolbarItem
          propKey="text"
          propType="component"
          type="textarea"
          label="Text"
          labelWidth="w-20"
        />
        <ToolbarItem
          propKey="as"
          propType="component"
          type="select"
          label="Tag"
          labelWidth="w-20"
        >
          <option value="td">td</option>
          <option value="th">th</option>
        </ToolbarItem>
        <SettingsAiSlot />
      </ToolbarSection>
    ),
    Properties: (
      <ToolbarSection
        title="Span"
        icon={SECTION_ICONS["Properties"]}
        help="colspan / rowspan for merged cells."
      >
        <ToolbarItem
          propKey="colSpan"
          propType="component"
          type="number"
          label="colSpan"
          labelWidth="w-24"
          min={1}
          max={99}
        />
        <ToolbarItem
          propKey="rowSpan"
          propType="component"
          type="number"
          label="rowSpan"
          labelWidth="w-24"
          min={1}
          max={99}
        />
        {props?.as === "th" && (
          <ToolbarItem
            propKey="scope"
            propType="component"
            type="select"
            label="scope"
            labelWidth="w-24"
          >
            <option value="">(auto)</option>
            <option value="col">col</option>
            <option value="row">row</option>
            <option value="colgroup">colgroup</option>
            <option value="rowgroup">rowgroup</option>
          </ToolbarItem>
        )}
      </ToolbarSection>
    ),
  });
};
