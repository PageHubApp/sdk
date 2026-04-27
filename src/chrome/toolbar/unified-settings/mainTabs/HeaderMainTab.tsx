import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots } from "../helpers";

/**
 * Header is a Container variant (`type: "header"`) — its prop surface matches
 * Container exactly. Layout / Design / Interactions tabs cover everything
 * (sticky / transparent / backdrop-blur are className choices), so the
 * Component tab only surfaces the AI helper slot, mirroring `BackgroundMainTab`.
 */
export const HeaderMainTab = () =>
  renderComponentSlots({
    Content: (
      <ToolbarSection collapsible={false}>
        <SettingsAiSlot />
      </ToolbarSection>
    ),
  });
