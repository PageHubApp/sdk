import { useSDK } from "../../../core/context";
import { SidebarTabsPane } from "../../primitives/SidebarTabsPane";
import { useAiEnabled } from "../../../utils/hooks/useAiEnabled";
import { usePanelUrl } from "../../../utils/usePanelUrl";
import { ComponentSettings } from "../modals/ComponentSettings";
import { SectionsSettings } from "../modals/SectionsSettings";

export const ToolboxTabs = () => {
  const { config } = useSDK();
  const isAiEnabled = useAiEnabled();
  const renderToolboxAi = config.editorChromeSlots?.renderToolboxAiButton;
  const { panel, switchTab } = usePanelUrl();

  const blocksEnabled = config.features?.blocksPanel?.enabled !== false;
  const currentTab = panel === "blocks" && blocksEnabled ? "blocks" : "components";

  // When blocks are disabled there's only one panel — skip the tab nav and
  // render the components panel directly. Keeps the chrome honest (no single-
  // tab dropdown) and reclaims the row of header space.
  if (!blocksEnabled) {
    return <ComponentSettings />;
  }

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
