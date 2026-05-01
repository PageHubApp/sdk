import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";

interface ToolbarIconButtonProps {
  onClick: () => void;
  tooltip: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  /** Extra className appended after the base — e.g. `text-error`. */
  className?: string;
}

/**
 * The 17 toolbar buttons in MediaToolbar all share this exact shape:
 * `tool-button flex h-full items-stretch px-2` + tooltip data-attrs +
 * an optional `bg-base-200 text-base-content` "active" highlight.
 */
export function ToolbarIconButton({
  onClick,
  tooltip,
  children,
  active,
  disabled,
  className,
}: ToolbarIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`tool-button flex h-full items-stretch px-2 ${active ? "bg-base-200 text-base-content" : ""} ${className || ""}`}
      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
      data-tooltip-content={tooltip}
      data-tooltip-place="bottom"
      data-tooltip-offset={10}
    >
      {children}
    </button>
  );
}
