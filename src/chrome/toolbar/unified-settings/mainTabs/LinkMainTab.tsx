import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { IconDialogInput } from "../../inputs/media/IconDialogInput";
import IconInput from "../../inputs/media/IconInput";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { TailwindStyles } from "@/utils/tailwind";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const LinkMainTab = () =>
  renderComponentSlots({
    Content: (
      <ToolbarSection
        title="Content"
        icon={SECTION_ICONS["Content"]}
        help="Link text and optional icon."
      >
        <ToolbarItem propKey="text" type="text" label="Text" propType="component" />
        <SettingsAiSlot />

        <IconDialogInput
          propKey="icon.value"
          propType="component"
          label="Icon"
          labelWidth="w-full"
          inputWidth="w-fit"
        />
        <ToolbarItem
          propKey="icon.only"
          propType="component"
          type="checkbox"
          label="Only Show Icon"
          on={true}
          labelHide
          labelWidth="w-full"
        />
        <ToolbarItem propKey="icon.position" propType="component" type="select" label="Position">
          <option value="left">Left</option>
          <option value="right">Right</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
        </ToolbarItem>
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
    ),
  });

export const LinkMainTabAdvanced = () => (
  <IconInput
    propKey="icon"
    propType="component"
    label="Icon"
    labelWidth="w-full"
    inputWidth="w-fit"
    iconOnlyLabel="Only Show Icon"
    positionLabel="Position"
  />
);
