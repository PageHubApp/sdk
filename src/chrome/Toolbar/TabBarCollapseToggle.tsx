import { Tooltip } from "components/layout/Tooltip";
import { TbChevronsDown, TbChevronsUp } from "react-icons/tb";

type AccordionCtx = { anyOpen: boolean; toggleAll: () => void };

export const TabBarCollapseToggle = ({
  unified,
  accordionCtx,
}: {
  unified: boolean;
  accordionCtx: AccordionCtx | null;
}) => {
  if (!unified || !accordionCtx) return <div />;
  return (
    <Tooltip content={accordionCtx.anyOpen ? "Collapse all" : "Expand all"} placement="top" arrow={false}>
      <button
        className="flex cursor-pointer items-center justify-center rounded-md p-1 text-sm text-secondary-foreground/70 transition-colors hover:text-foreground"
        onClick={accordionCtx.toggleAll}
      >
        {accordionCtx.anyOpen ? <TbChevronsUp /> : <TbChevronsDown />}
      </button>
    </Tooltip>
  );
};
