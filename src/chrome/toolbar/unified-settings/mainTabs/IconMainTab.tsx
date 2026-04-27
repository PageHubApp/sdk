import { IconDialogInput } from "../../inputs/media/IconDialogInput";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { TailwindStyles } from "@/utils/tailwind";
import { renderComponentSlots } from "../helpers";

export const IconMainTab = () =>
  renderComponentSlots({
    Content: (
      <ToolbarSection collapsible={false}>
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
