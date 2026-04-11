import { SettingsAiSlot } from "../../../SettingsAiSlot";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const SpacerMainTab = () =>
  renderComponentSlots({
    Content: (
      <ToolbarSection title="Content" icon={SECTION_ICONS["Content"]} help="Vertical or horizontal spacing.">
        <SettingsAiSlot />
      </ToolbarSection>
    ),
  });
