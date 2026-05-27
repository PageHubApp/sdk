import { SlotRenderer } from "../../../../registry";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots } from "../helpers";

export const BackgroundMainTab = () => {
  return renderComponentSlots({
    Content: (
      <ToolbarSection collapsible={false}>
        <SlotRenderer id="settings/ai-button" />
      </ToolbarSection>
    ),
  });
};
