import { SlotRenderer } from "../../../../registry";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots } from "../helpers";

/**
 * Footer is a Container variant (`type: "footer"`) — its prop surface matches
 * Container exactly. Layout / Design / Interactions tabs cover everything via
 * the shared property registry, so the Component tab only surfaces the AI
 * helper slot, mirroring `BackgroundMainTab`.
 */
export const FooterMainTab = () => {
  return renderComponentSlots({
    Content: (
      <ToolbarSection collapsible={false}>
        <SlotRenderer id="settings/ai-button" />
      </ToolbarSection>
    ),
  });
};
