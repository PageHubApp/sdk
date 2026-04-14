import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import { SidebarTabPanel } from "./SidebarTabPanel";

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
  /** `compact` = tighter horizontal padding (theme strip); `default` = toolbox / import-export */
  tabDensity?: SidebarTabDensity;
  className?: string;
  bodyClassName?: string;
}

const inactive =
  "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground";
const active = "bg-sidebar-accent text-sidebar-accent-foreground";

function tabPad(density: SidebarTabDensity | undefined, hasIcon: boolean): string {
  if (density === "compact") return "gap-1.5 px-2 py-3";
  return hasIcon ? "gap-2 px-4 py-3" : "px-4 py-3";
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

  return (
    <SidebarTabPanel
      className={className}
      bodyClassName={bodyClassName}
      tabList={
        <div ref={tablistRef} className="flex min-w-0" role="tablist" aria-label={ariaLabel}>
          {tabs.map((tab, i) => {
            const hasIcon = Boolean(tab.icon);
            const pad = tabPad(tabDensity, hasIcon);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onValueChange(tab.id)}
                onKeyDown={e => handleTabKeyDown(e, i)}
                className={twMerge(
                  "flex min-w-0 flex-1 cursor-pointer items-center justify-center text-sm font-medium transition-colors",
                  pad,
                  value === tab.id ? active : inactive
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
          })}
          {trailing ?? null}
        </div>
      }
    >
      {tabs.find(t => t.id === value)?.content}
    </SidebarTabPanel>
  );
}
