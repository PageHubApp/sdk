import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { PAGEHUB_RTT_GLOBAL_ID } from "./layout/tooltipSurface";

/**
 * Canonical small icon button used across the toolbar / chrome.
 *
 * Shape: `flex size-5 shrink-0 items-center justify-center rounded` with
 * `text-neutral-content hover:text-base-content`. Two visual variants:
 *
 *   - `ghost` (default) — no hover bg. Used by `InlineClearButton` and
 *     `ChevronTrigger` inside `Chip` trailing slots.
 *   - `subtle` — `hover:bg-neutral` ramp. Used when the button stands alone
 *     outside a row frame (e.g. design-var picker trigger next to an input).
 *
 * Pass `tooltip` to wire `react-tooltip` against the global surface — same
 * convention as the rest of the editor chrome (see `.claude/rules/tooltips.md`).
 */
type Variant = "ghost" | "subtle";

interface Props
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type" | "aria-label"> {
  children: ReactNode;
  variant?: Variant;
  tooltip?: string;
  /** Required so screen readers + react-tooltip both have a name. */
  ariaLabel: string;
}

const VARIANT_CLASS: Record<Variant, string> = {
  ghost: "text-neutral-content hover:text-base-content",
  subtle: "text-neutral-content hover:bg-neutral hover:text-base-content transition-colors",
};

export const ToolbarIconButton = forwardRef<HTMLButtonElement, Props>(function ToolbarIconButton(
  { children, variant = "ghost", tooltip, ariaLabel, className = "", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      data-tooltip-id={tooltip ? PAGEHUB_RTT_GLOBAL_ID : undefined}
      data-tooltip-content={tooltip}
      className={`${VARIANT_CLASS[variant]} flex size-5 shrink-0 items-center justify-center rounded ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});
