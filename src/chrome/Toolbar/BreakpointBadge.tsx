/**
 * Shared badge for breakpoint indicators.
 * Rectangular for a single item / short label, pill-shaped for multiple.
 * Pass `pill` to force pill shape regardless of content.
 */
export function BreakpointBadge({
  children,
  pill = false,
  className = "",
  onClick,
  onContextMenu,
}: {
  children: React.ReactNode;
  pill?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const isPill = pill || (typeof children === "number" ? children > 1 : String(children).length > 2);
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`inline-flex items-center justify-center text-[9px] font-semibold leading-tight transition-colors ${
        isPill ? "rounded-full px-1.5 py-0.5" : "rounded px-1 py-0.5"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
