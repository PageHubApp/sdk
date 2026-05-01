import { TbLayoutGrid, TbList } from "react-icons/tb";
import { TOOL_CLUSTER_CLASS } from "./styles";
import { ToolbarIconButton } from "./ToolbarIconButton";

interface ViewModeClusterProps {
  viewMode: "cards" | "list";
  setViewMode: (mode: "cards" | "list") => void;
}

export function ViewModeCluster({ viewMode, setViewMode }: ViewModeClusterProps) {
  return (
    <div className={`${TOOL_CLUSTER_CLASS} order-2`}>
      <ToolbarIconButton
        onClick={() => setViewMode("cards")}
        tooltip="Card view"
        active={viewMode === "cards"}
      >
        <TbLayoutGrid className="size-4" />
      </ToolbarIconButton>
      <ToolbarIconButton
        onClick={() => setViewMode("list")}
        tooltip="List view"
        active={viewMode === "list"}
      >
        <TbList className="size-4" />
      </ToolbarIconButton>
    </div>
  );
}
