import { TbSearch } from "react-icons/tb";
import { TOOL_CLUSTER_CLASS } from "./styles";
import { ToolbarIconButton } from "./ToolbarIconButton";

interface SearchToggleProps {
  showCompactSearch: boolean;
  hasSearchQuery: boolean;
  onToggle: () => void;
}

export function SearchToggle({ showCompactSearch, hasSearchQuery, onToggle }: SearchToggleProps) {
  return (
    <div className={`${TOOL_CLUSTER_CLASS} order-1`}>
      <ToolbarIconButton
        onClick={onToggle}
        tooltip="Search media"
        active={showCompactSearch || hasSearchQuery}
      >
        <TbSearch className="size-4" />
      </ToolbarIconButton>
    </div>
  );
}
