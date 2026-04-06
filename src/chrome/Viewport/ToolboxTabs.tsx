import { Fragment, useRef } from "react";
import { useSDK } from "../../context";
import { useAiEnabled } from "utils/hooks/useAiEnabled";
import { usePanelUrl } from "../../utils/usePanelUrl";
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
  const { switchTab } = usePanelUrl();

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

  const tablistRef = useRef<HTMLDivElement>(null);

  const tabDivider = (
    <div
      aria-hidden
      className="w-px shrink-0 self-stretch bg-sidebar-border"
    />
  );

  const handleTabKeyDown = (e: React.KeyboardEvent, tabIndex: number) => {
    let nextIndex = tabIndex;
    if (e.key === "ArrowRight") nextIndex = (tabIndex + 1) % tabs.length;
    else if (e.key === "ArrowLeft") nextIndex = tabIndex === 0 ? tabs.length - 1 : tabIndex - 1;
    else return;
    e.preventDefault();
    const nextTab = tabs[nextIndex];
    tablistRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[nextIndex]?.focus();
    switchTab(nextTab.id === "sections" ? "blocks" : "components");
    setHeaderMenu(prev => ({ ...prev, activeTab: nextTab.id, menuType: nextTab.id }));
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Tab Headers */}
      <div ref={tablistRef} className="flex min-w-0 border-t border-sidebar-border" role="tablist" aria-label="Content tabs">
        {tabs.map((tab, i) => (
          <Fragment key={tab.id}>
            {i > 0 ? tabDivider : null}
            <button
              onClick={() => {
                switchTab(tab.id === "sections" ? "blocks" : "components");
                setHeaderMenu(prev => ({
                  ...prev,
                  activeTab: tab.id,
                  menuType: tab.id
                }));
              }}
              onKeyDown={(e) => handleTabKeyDown(e, i)}
              className={`min-w-0 flex-1 cursor-pointer px-4 py-3 text-sm font-medium transition-colors ${currentTab === tab.id
                ? "border-b-2 border-b-primary text-primary bg-background"
                : "border-b-2 border-b-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              role="tab"
              aria-selected={currentTab === tab.id}
              tabIndex={currentTab === tab.id ? 0 : -1}
            >
              {tab.label}
            </button>
          </Fragment>
        ))}

        {isAiEnabled && renderToolboxAi ? (
          <>
            {tabDivider}
            {renderToolboxAi()}
          </>
        ) : null}
      </div>

      {/* Tab Content */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-sidebar-border">
        {tabs.find(tab => tab.id === currentTab)?.component}
      </div>
    </div>
  );
};
