// @ts-nocheck
import { useSDK } from "../../context";
import { useAiEnabled } from "utils/hooks/useAiEnabled";
import { ComponentSettings } from "./ComponentSettings";
import { SectionsSettings } from "./SectionsSettings";

interface ToolboxTabsProps {
  headerMenu: {
    isOpen: boolean;
    activeTab: string;
    menuType: string;
  };
  setHeaderMenu: (value: any) => void;
}

export const ToolboxTabs = ({ headerMenu, setHeaderMenu }: ToolboxTabsProps) => {
  const { config } = useSDK();
  const isAiEnabled = useAiEnabled();
  const renderToolboxAi = config.editorChromeSlots?.renderToolboxAiButton;

  // Sync tab with menu type
  const currentTab = headerMenu.menuType === "sections" ? "sections" :
    headerMenu.menuType === "components" ? "components" : "components";

  const tabs = [
    {
      id: "components",
      label: "Components",
      component: <ComponentSettings />
    },
    {
      id: "sections",
      label: "Blocks",
      component: <SectionsSettings />
    }
  ];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Tab Headers */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setHeaderMenu(prev => ({
                ...prev,
                activeTab: tab.id,
                menuType: tab.id
              }));
            }}
            className={`flex-1 cursor-pointer px-4 py-3 text-sm font-medium transition-colors ${currentTab === tab.id
              ? "border-b-2 border-primary text-primary bg-background"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
          >
            {tab.label}
          </button>
        ))}

        {isAiEnabled && renderToolboxAi && <>{renderToolboxAi()}</>}
      </div>

      {/* Tab Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {tabs.find(tab => tab.id === currentTab)?.component}
      </div>
    </div>
  );
};
