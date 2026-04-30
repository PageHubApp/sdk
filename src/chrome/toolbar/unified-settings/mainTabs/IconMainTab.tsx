import { IconDialogInput } from "../../inputs/media/IconDialogInput";
import { ToolbarSection } from "../../ToolbarSection";
import { UniversalInput } from "../../inputs/universal-input";
import { renderComponentSlots } from "../helpers";

export const IconMainTab = () =>
  renderComponentSlots({
    Content: (
      <ToolbarSection collapsible={false}>
        <IconDialogInput propKey="value" propType="component" label="Icon" />
        <UniversalInput
          propKey="size"
          propType="class"
          propTag="size"
          label="Size"
          tailwindKey="size"
          showVarSelector
          allowedTypes={["tailwind", "calc", "px", "%", "em", "rem", "vw", "vh"]}
          inputWidth="flex-1"
        />
      </ToolbarSection>
    ),
  });
