import { useEffect } from "react";
import type { ReactNode } from "react";
import { FloatingPanel, useFloatingPanelDrag } from "../../../floating/FloatingPanel";
import { AutoHideScrollbar } from "../../../primitives/layout/AutoHideScrollbar";

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
      ? "border-primary bg-base-200 text-base-content"
      : "border-transparent text-base-content/70 hover:border-base-300 hover:bg-base-200/60 hover:text-base-content"
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
      autoSize={false}
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
      headerless
    >
      <SettingsShellBody
        title={title}
        tabs={tabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        footer={footer}
      >
        {children}
      </SettingsShellBody>
    </FloatingPanel>
  );
}

interface SettingsShellBodyProps {
  title: string;
  tabs: SettingsShellTab[];
  activeTab: string;
  setActiveTab: (key: string) => void;
  footer?: ReactNode;
  children: ReactNode;
}

function SettingsShellBody({
  title,
  tabs,
  activeTab,
  setActiveTab,
  footer,
  children,
}: SettingsShellBodyProps) {
  const drag = useFloatingPanelDrag();
  const dragCursor = drag?.isDragging ? "cursor-grabbing" : "cursor-grab";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className="border-base-300 flex w-52 shrink-0 flex-col border-r"
          aria-label={`${title} sections`}
        >
          <div
            role="presentation"
            aria-hidden="true"
            onPointerDown={drag?.onPointerDown}
            className={`text-base-content flex touch-none items-center px-4 py-3 ${dragCursor}`}
          >
            <span className="min-w-0 truncate text-sm font-semibold">{title}</span>
          </div>
          <nav
            className="scrollbar-light flex min-h-0 flex-1 flex-col overflow-y-auto py-1"
            aria-label={`${title} tabs`}
          >
            {tabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={tabButtonClass(activeTab === tab.key)}
              >
                {tab.icon ? (
                  <span className="shrink-0 opacity-90 [&>svg]:size-4">{tab.icon}</span>
                ) : null}
                <span className="min-w-0 truncate">{tab.label}</span>
              </button>
            ))}
          </nav>
          <div className="border-base-300 border-t p-3">
            <button
              type="button"
              onClick={drag?.onClose}
              className="btn btn-secondary btn-sm w-full"
            >
              Close
            </button>
          </div>
        </div>

        <AutoHideScrollbar className="bg-base-100 text-base-content flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-full flex-col p-6">{children}</div>
        </AutoHideScrollbar>
      </div>
      {footer ? <div className="border-base-300 border-t p-4">{footer}</div> : null}
    </div>
  );
}
