import { useSDK } from "../../../../core/context";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots } from "../helpers";

/**
 * Footer is a Container variant (`type: "footer"`) — its prop surface matches
 * Container exactly. Layout / Design / Interactions tabs cover everything via
 * the shared property registry, so the Component tab only surfaces the AI
 * helper slot, mirroring `BackgroundMainTab`.
 */
export const FooterMainTab = () => {
  const { config } = useSDK();
  return renderComponentSlots({
    Content: (
      <ToolbarSection collapsible={false}>
        {config.editorChromeSlots?.settingsAiButton}
      </ToolbarSection>
    ),
  });
};
