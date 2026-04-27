import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots } from "../helpers";

/**
 * Footer is a Container variant (`type: "footer"`) — its prop surface matches
 * Container exactly. Layout / Design / Interactions tabs cover everything via
 * the shared property registry, so the Component tab only surfaces the AI
 * helper slot, mirroring `BackgroundMainTab`.
 */
export const FooterMainTab = () =>
  renderComponentSlots({
    Content: (
      <ToolbarSection collapsible={false}>
        <SettingsAiSlot />
      </ToolbarSection>
    ),
  });
