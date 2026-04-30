import type { ReactNode } from "react";

/**
 * Outer shell for sidebar tab panels (Components, Blocks, Import/Export, etc.).
 * Provides the column layout + overflow clipping every panel needs.
 */
export const PanelBody = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => <div className={`flex flex-1 flex-col overflow-hidden ${className}`}>{children}</div>;

/**
 * Bottom-of-scroll filler so the last grid item isn't flush with the panel
 * bottom and the user has somewhere to "park" the scroll.
 */
export const PanelScrollSpacer = () => <div className="shrink-0" style={{ minHeight: "70vh" }} />;
