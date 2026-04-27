import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots } from "../helpers";

export const SpacerMainTab = () =>
  renderComponentSlots({
    Content: (
      <ToolbarSection collapsible={false}>
        <SettingsAiSlot />
      </ToolbarSection>
    ),
  });
