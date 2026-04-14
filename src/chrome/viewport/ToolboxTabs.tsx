import { useSDK } from "../../core/context";
import { SidebarTabsPane } from "../primitives/SidebarTabsPane";
import { useAiEnabled } from "../../utils/hooks/useAiEnabled";
import { usePanelUrl } from "../../utils/usePanelUrl";
import { ComponentSettings } from "./ComponentSettings";
import { SectionsSettings } from "./SectionsSettings";

export const ToolboxTabs = () => {
  const { config } = useSDK();
  const isAiEnabled = useAiEnabled();
  const renderToolboxAi = config.editorChromeSlots?.renderToolboxAiButton;
  const { panel, switchTab } = usePanelUrl();

  const currentTab = panel === "blocks" ? "blocks" : "components";

  return (
    <SidebarTabsPane
      ariaLabel="Content tabs"
      value={currentTab}
      onValueChange={id => switchTab(id as "components" | "blocks")}
      trailing={isAiEnabled && renderToolboxAi ? renderToolboxAi() : null}
      tabs={[
        {
          id: "components",
          label: "Components",
          content: <ComponentSettings />,
        },
        {
          id: "blocks",
          label: "Blocks",
          content: <SectionsSettings />,
        },
      ]}
    />
  );
};
