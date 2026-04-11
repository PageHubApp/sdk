import { SettingsAiSlot } from "../../../SettingsAiSlot";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const BackgroundMainTab = () =>
  renderComponentSlots({
    Content: (
      <ToolbarSection title="Content" icon={SECTION_ICONS["Content"]} help="Page background and theme root.">
        <SettingsAiSlot />
      </ToolbarSection>
    ),
  });
