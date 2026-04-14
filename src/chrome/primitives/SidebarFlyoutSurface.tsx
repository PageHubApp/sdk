import type { ReactNode } from "react";
import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

export interface SidebarFlyoutSurfaceProps {
  children: ReactNode;
  className?: string;
}

/**
 * Inner column for editor nav flyouts: fills the `<nav>` flex area under the measured header row.
 */
export const SidebarFlyoutSurface = forwardRef<HTMLDivElement, SidebarFlyoutSurfaceProps>(
  function SidebarFlyoutSurface({ children, className }, ref) {
    return (
      <div ref={ref} className={twMerge("flex min-h-0 w-full min-w-0 flex-1 flex-col", className)}>
        {children}
      </div>
    );
  }
);
