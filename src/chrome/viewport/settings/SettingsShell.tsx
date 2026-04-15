import { useEffect } from "react";
import type { ReactNode } from "react";
import { FloatingPanel } from "../../floating/FloatingPanel";

interface SettingsShellTab {
  key: string;
  label: string;
  icon?: ReactNode;
}

interface SettingsShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  storageKey: string;
  tabs: SettingsShellTab[];
  activeTab: string;
  setActiveTab: (key: string) => void;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  dockToEdge?: "left" | "right";
  zIndex?: number;
  children: ReactNode;
  footer?: ReactNode;
}

function tabButtonClass(isActive: boolean) {
  return `flex min-h-11 w-full items-center gap-2 border-l-2 px-4 py-2 text-left text-sm font-medium transition-colors ${
    isActive
      ? "border-primary bg-base-100 text-base-content"
      : "border-transparent text-neutral-content hover:bg-base-200 hover:text-base-content"
  }`;
}

export function SettingsShell({
  isOpen,
  onClose,
  title,
  storageKey,
  tabs,
  activeTab,
  setActiveTab,
  defaultWidth,
  defaultHeight,
  minWidth,
  maxWidth,
  minHeight,
  maxHeight,
  dockToEdge,
  zIndex,
  children,
  footer,
}: SettingsShellProps) {
  useEffect(() => {
    if (!tabs.length) return;
    if (!tabs.some(tab => tab.key === activeTab)) {
      setActiveTab(tabs[0].key);
    }
  }, [activeTab, setActiveTab, tabs]);

  return (
    <FloatingPanel
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      storageKey={storageKey}
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
      minWidth={minWidth}
      maxWidth={maxWidth}
      minHeight={minHeight}
      maxHeight={maxHeight}
      dockToEdge={dockToEdge}
      closeButtonSide={dockToEdge === "left" ? "left" : "right"}
      zIndex={zIndex}
      edges={["e", "s", "se", "w", "sw"]}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <nav
            className="border-base-300 bg-neutral scrollbar-light flex w-52 shrink-0 flex-col overflow-y-auto border-r py-1"
            aria-label={`${title} sections`}
          >
            {tabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={tabButtonClass(activeTab === tab.key)}
              >
                {tab.icon ? <span className="shrink-0 opacity-90 [&>svg]:size-4">{tab.icon}</span> : null}
                <span className="min-w-0 truncate">{tab.label}</span>
              </button>
            ))}
          </nav>

          <div className="scrollbar-light bg-base-100 text-base-content flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-6">
            {children}
          </div>
        </div>
        {footer ? <div className="border-base-300 bg-neutral border-t p-4">{footer}</div> : null}
      </div>
    </FloatingPanel>
  );
}
