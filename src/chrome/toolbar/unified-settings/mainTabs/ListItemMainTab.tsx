import { useNode } from "@craftjs/core";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { IconDialogInput } from "../../inputs/media/IconDialogInput";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const ListItemMainTab = () => {
  const { props } = useNode(node => ({ props: node.data?.props }));
  const showIconOverride = props?.markerStyle === "icon";

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
        <SettingsAiSlot />
      </ToolbarSection>
    ),
    Marker: (
      <ToolbarSection
        title="Marker"
        icon={SECTION_ICONS["Marker"]}
        help="Override the parent list marker for this row only."
      >
        <ToolbarItem
          propKey="markerStyle"
          propType="component"
          type="select"
          label="Style"
          labelWidth="w-20"
        >
          <option value="inherit">Inherit from list</option>
          <option value="check">Check</option>
          <option value="bullet">Bullet</option>
          <option value="dash">Dash</option>
          <option value="icon">Icon</option>
        </ToolbarItem>
        {showIconOverride && (
          <>
            <IconDialogInput
              propKey="markerIcon.value"
              propType="component"
              label="Icon"
              labelWidth="w-full"
              inputWidth="w-fit"
            />
            <ToolbarItem
              propKey="markerIcon.size"
              propType="component"
              type="text"
              label="Icon size"
              labelWidth="w-20"
              placeholder="w-5 h-5"
            />
          </>
        )}
      </ToolbarSection>
    ),
  });
};
