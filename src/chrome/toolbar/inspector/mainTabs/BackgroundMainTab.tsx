import { useSDK } from "../../../../core/context";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots } from "../helpers";

export const BackgroundMainTab = () => {
  const { config } = useSDK();
  return renderComponentSlots({
    Content: (
      <ToolbarSection collapsible={false}>
        {config.editorChromeSlots?.settingsAiButton}
      </ToolbarSection>
    ),
  });
};
