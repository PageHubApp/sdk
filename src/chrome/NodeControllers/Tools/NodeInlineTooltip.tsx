import { REACT_TOOLTIP_SURFACE_CLASS } from "components/layout/tooltipSurface";
import { useId, type ReactNode } from "react";
import { Tooltip as ReactTooltip, type PlacesType } from "react-tooltip";

/** `data-node-tool-tip` on the anchor — strip = Button row, strip-compact = layout Container, container = full container toolbar. */
export type NodeInlineTipVariant = "strip" | "strip-compact" | "container";

type NodeInlineTooltipProps = {
  content: string;
  variant?: NodeInlineTipVariant;
  placement?: PlacesType;
  /** Classes on the anchor (e.g. segment borders in the wide container toolbar). */
  className?: string;
  tooltipClassName?: string;
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
  tooltipClassName = "",
  delay = 0,
  children,
}: NodeInlineTooltipProps) {
  const instanceId = useId().replace(/:/g, "");
  const id = `node-inline-tip-${variant}-${instanceId}`;

  return (
    <>
      <span
        data-node-tool-tip={variant}
        className={`inline-flex max-w-full shrink-0 cursor-pointer items-center ${className}`.trim()}
        data-tooltip-id={id}
        data-tooltip-content={content}
        data-tooltip-place={placement}
        data-tooltip-offset={10}
        {...(delay > 0 ? { "data-tooltip-delay-show": delay } : {})}
        onMouseDown={e => e.stopPropagation()}
      >
        {children}
      </span>
      <ReactTooltip
        id={id}
        variant="light"
        classNameArrow="hidden"
        delayShow={delay}
        className={`${REACT_TOOLTIP_SURFACE_CLASS} ${tooltipClassName}`.trim()}
      />
    </>
  );
}
