import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { SidebarTabPanel } from "./SidebarTabPanel";
import { useChromeStyle } from "./useChromeStyle";

export type SidebarTabDensity = "default" | "compact";

export interface SidebarTabsPaneItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  content: ReactNode;
}

export interface SidebarTabsPaneProps {
  ariaLabel: string;
  tabs: SidebarTabsPaneItem[];
  value: string;
  onValueChange: (id: string) => void;
  trailing?: ReactNode;
  /** `compact` = tighter horizontal padding (theme strip); `default` = toolbox */
  tabDensity?: SidebarTabDensity;
  className?: string;
  bodyClassName?: string;
}

function tabPad(density: SidebarTabDensity | undefined, hasIcon: boolean): string {
  if (density === "compact") return "gap-1.5 px-2 py-2";
  return hasIcon ? "gap-2 px-4 py-2" : "px-4 py-2";
}

export function SidebarTabsPane({
  ariaLabel,
  tabs,
  value,
  onValueChange,
  trailing,
  tabDensity = "default",
  className,
  bodyClassName,
}: SidebarTabsPaneProps) {
  const tablistRef = useRef<HTMLDivElement>(null);
  const chrome = useChromeStyle();

  const handleTabKeyDown = (e: KeyboardEvent, tabIndex: number) => {
    let nextIndex = tabIndex;
    if (e.key === "ArrowRight") nextIndex = (tabIndex + 1) % tabs.length;
    else if (e.key === "ArrowLeft") nextIndex = tabIndex === 0 ? tabs.length - 1 : tabIndex - 1;
    else return;
    e.preventDefault();
    const nextTab = tabs[nextIndex];
    tablistRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[nextIndex]?.focus();
    onValueChange(nextTab.id);
  };

  const tabButtons = tabs.map((tab, i) => {
    const hasIcon = Boolean(tab.icon);
    // The dashboard pill carries its own height and padding.
    const pad = chrome.sidebarTabPills ? "" : tabPad(tabDensity, hasIcon);
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => onValueChange(tab.id)}
        onKeyDown={e => handleTabKeyDown(e, i)}
        className={twMerge(
          chrome.sidebarTabBase,
          pad,
          value === tab.id ? chrome.sidebarTabActive : chrome.sidebarTabIdle
        )}
        role="tab"
        aria-selected={value === tab.id}
        tabIndex={value === tab.id ? 0 : -1}
      >
        {tab.icon}
        {typeof tab.label === "string" ? (
          hasIcon ? (
            <span className="truncate">{tab.label}</span>
          ) : (
            tab.label
          )
        ) : (
          tab.label
        )}
      </button>
    );
  });

  return (
    <SidebarTabPanel
      className={
        chrome.sidebarTabPanelRoot ? twMerge(chrome.sidebarTabPanelRoot, className) : className
      }
      bodyClassName={bodyClassName}
      tabList={
        <div
          ref={tablistRef}
          className={chrome.sidebarTabStrip}
          role="tablist"
          aria-label={ariaLabel}
        >
          {chrome.sidebarTabPills ? (
            <div className={chrome.sidebarTabPills}>{tabButtons}</div>
          ) : (
            tabButtons
          )}
          {trailing ?? null}
        </div>
      }
    >
      {tabs.find(t => t.id === value)?.content}
    </SidebarTabPanel>
  );
}
