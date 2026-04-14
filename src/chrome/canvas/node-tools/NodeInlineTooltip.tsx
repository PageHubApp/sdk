import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { type ReactNode } from "react";

/** `data-node-tool-tip` on the anchor — strip = Button row, strip-compact = layout Container, container = full container toolbar. */
export type NodeInlineTipVariant = "strip" | "strip-compact" | "container";

type NodeInlineTooltipProps = {
  content: string;
  variant?: NodeInlineTipVariant;
  placement?: "top" | "bottom" | "left" | "right";
  /** Classes on the anchor (e.g. segment borders in the wide container toolbar). */
  className?: string;
  delay?: number;
  children: ReactNode;
};

/**
 * react-tooltip anchor for node chrome — keeps one consistent pattern and
 * avoids the layout `Tooltip` click wrapper where we only need hover labels.
 */
export function NodeInlineTooltip({
  content,
  variant = "strip",
  placement = "top",
  className = "",
  delay = 0,
  children,
}: NodeInlineTooltipProps) {
  return (
    <span
      data-node-tool-tip={variant}
      className={`inline-flex max-w-full shrink-0 cursor-pointer items-center ${className}`.trim()}
      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
      data-tooltip-content={content}
      data-tooltip-place={placement}
      data-tooltip-offset={10}
      {...(delay > 0 ? { "data-tooltip-delay-show": delay } : {})}
      onMouseDown={e => e.stopPropagation()}
    >
      {children}
    </span>
  );
}
