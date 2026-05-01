import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { TbArrowDown, TbArrowUp, TbCalendar } from "react-icons/tb";
import { ToolbarDropdown } from "../../../../ToolbarDropdown";
import type { SortDirection, SortField } from "../../utils/media-helpers";
import { TOOL_CLUSTER_CLASS } from "./styles";

interface SortClusterProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onChangeSortField: (field: SortField) => void;
  onToggleDirection: () => void;
}

const SORT_OPTIONS = (
  <>
    <option value="createdAt">Date</option>
    <option value="name">Name</option>
    <option value="size">Size</option>
    <option value="order">Order</option>
  </>
);

/**
 * Two ToolbarDropdown instances — desktop (with `append` direction button)
 * and mobile (sibling direction button). Kept as separate ph-select instances
 * because their `propKey`s persist independent listbox open/close state.
 */
export function SortCluster({
  sortField,
  sortDirection,
  onChangeSortField,
  onToggleDirection,
}: SortClusterProps) {
  const directionTooltip = `${sortField} • ${sortDirection === "asc" ? "ascending" : "descending"}`;
  const mobileDirectionTooltip = `Sort ${sortDirection === "asc" ? "ascending" : "descending"}`;
  const DirectionIcon = sortDirection === "asc" ? TbArrowUp : TbArrowDown;

  const directionButton = (tooltip: string) => (
    <button
      type="button"
      onClick={onToggleDirection}
      className="tool-button flex h-full items-stretch px-1.5"
      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
      data-tooltip-content={tooltip}
      data-tooltip-place="bottom"
      data-tooltip-offset={10}
    >
      <DirectionIcon className="size-3.5" />
    </button>
  );

  return (
    <div className={`${TOOL_CLUSTER_CLASS} order-2 min-w-0`}>
      <div className="hidden h-full min-h-0 items-stretch md:flex">
        <ToolbarDropdown
          wrap="control"
          propKey="media-sort-field"
          tooltipId={PAGEHUB_RTT_GLOBAL_ID}
          tooltipContent="Sort by"
          placeholder={<TbCalendar className="size-4" />}
          value=""
          onChange={(val: string) => onChangeSortField(val as SortField)}
          append={directionButton(directionTooltip)}
        >
          {SORT_OPTIONS}
        </ToolbarDropdown>
      </div>
      <div className="flex h-full min-h-0 items-stretch md:hidden">
        <ToolbarDropdown
          wrap="control"
          propKey="media-sort-field-compact"
          tooltipId={PAGEHUB_RTT_GLOBAL_ID}
          tooltipContent="Sort by"
          placeholder={<TbCalendar className="size-4" />}
          value=""
          onChange={(val: string) => onChangeSortField(val as SortField)}
        >
          {SORT_OPTIONS}
        </ToolbarDropdown>
        {directionButton(mobileDirectionTooltip)}
      </div>
    </div>
  );
}
