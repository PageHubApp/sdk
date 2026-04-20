import { IconDialogInput } from "../../inputs/media/IconDialogInput";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { TailwindStyles } from "@/utils/tailwind";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const IconMainTab = () =>
  renderComponentSlots({
    Content: (
      <ToolbarSection
        title="Content"
        icon={SECTION_ICONS["Content"]}
        help="Pick an icon and choose its size."
      >
        <IconDialogInput
          propKey="value"
          propType="component"
          label="Icon"
          labelWidth="w-full"
          inputWidth="w-fit"
        />
        <ToolbarItem
          propKey="size"
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
