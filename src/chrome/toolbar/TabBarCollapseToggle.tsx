import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { TbChevronsDown, TbChevronsUp } from "react-icons/tb";

type AccordionCtx = { anyOpen: boolean; toggleAll: () => void };

export const TabBarCollapseToggle = ({
  unified,
  accordionCtx,
  className = "text-secondary-content/70 hover:text-base-content flex size-10 cursor-pointer items-center justify-center rounded-md p-0 text-sm transition-[color,transform] active:scale-90",
}: {
  unified: boolean;
  accordionCtx: AccordionCtx | null;
  /** The button's chrome; `useChromeStyle().inspectorCollapseButton`. */
  className?: string;
}) => {
  if (!unified || !accordionCtx) return <div />;
  return (
    <button
      className={className}
      onClick={accordionCtx.toggleAll}
      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
      data-tooltip-content={accordionCtx.anyOpen ? "Collapse all" : "Expand all"}
      data-tooltip-place="top"
      data-tooltip-offset={10}
    >
      {accordionCtx.anyOpen ? <TbChevronsUp /> : <TbChevronsDown />}
    </button>
  );
};
