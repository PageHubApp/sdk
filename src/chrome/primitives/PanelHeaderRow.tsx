import { ReactNode } from "react";

/**
 * Shared top-of-panel header bar used by sidebar panels (Components, Blocks,
 * category detail, etc.). Bottom border, base-100 fill, slim vertical padding
 * sized to match the slim `SearchInput`.
 */
export const PanelHeaderRow = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={`border-base-300 bg-base-100 flex h-12 shrink-0 items-center gap-2 border-b px-3 ${className}`}
  >
    {children}
  </div>
);
