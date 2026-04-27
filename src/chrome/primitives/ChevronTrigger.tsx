import { forwardRef } from "react";
import { TbChevronDown } from "react-icons/tb";
import { ToolbarIconButton } from "./ToolbarIconButton";

/**
 * Trailing chevron button for `ToolbarRowFrame`. Same shape and X position as
 * `InlineClearButton`, so dropdowns and clear buttons line up at the same 4px
 * inset from the wrapper border. Composes from `ToolbarIconButton`.
 */
export const ChevronTrigger = forwardRef<
  HTMLButtonElement,
  {
    onClick?: (e: React.MouseEvent) => void;
    open?: boolean;
    tooltip?: string;
    className?: string;
  }
>(function ChevronTrigger({ onClick, open = false, tooltip = "Open", className = "" }, ref) {
  return (
    <ToolbarIconButton
      ref={ref}
      onClick={e => {
        e.stopPropagation();
        onClick?.(e);
      }}
      aria-expanded={open}
      ariaLabel={tooltip}
      tooltip={tooltip}
      className={className}
    >
      <TbChevronDown
        className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
        aria-hidden
      />
    </ToolbarIconButton>
  );
});
