import { IconInput } from "../../inputs/media/IconInput";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots } from "../helpers";

export const LinkMainTab = () =>
  renderComponentSlots({
    Content: (
      <ToolbarSection collapsible={false}>
        <ToolbarItem propKey="text" type="text" label="Text" propType="component" />

        <IconInput propKey="icon" />
      </ToolbarSection>
    ),
  });
