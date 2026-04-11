import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export interface SidebarTabPanelProps {
  /** Typically a `role="tablist"` row. Wrapped in `shrink-0`. */
  tabList: ReactNode;
  children: ReactNode;
  className?: string;
  /** Merged onto the scroll body; use e.g. `overflow-y-auto bg-base-100` when the pane scrolls. */
  bodyClassName?: string;
}

/**
 * Tab strip + body for sidebar / toolbox panels. The line between strip and body is owned by
 * `divide-y divide-sidebar-border` on the root (not `border-t` on the body).
 */
export function SidebarTabPanel({ tabList, children, className, bodyClassName }: SidebarTabPanelProps) {
  return (
    <div
      className={twMerge(
        "flex min-h-0 flex-1 flex-col divide-y divide-sidebar-border overflow-hidden",
        className
      )}
    >
      <div className="shrink-0">{tabList}</div>
      <div className={twMerge("flex min-h-0 flex-1 flex-col overflow-hidden", bodyClassName)}>{children}</div>
    </div>
  );
}
