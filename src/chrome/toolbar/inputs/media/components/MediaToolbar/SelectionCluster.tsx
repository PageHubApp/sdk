import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { TbEdit, TbEye, TbFolder, TbRefresh, TbScissors, TbTrash, TbX } from "react-icons/tb";
import { ToolbarDropdown } from "../../../../ToolbarDropdown";
import { TOOL_CLUSTER_CLASS } from "./styles";
import { ToolbarIconButton } from "./ToolbarIconButton";

interface SelectionClusterProps {
  busy: boolean;
  folders: Array<{ id: string; name: string }>;
  singleSelectedId: string | null;
  onMoveSelectedToFolder: (folderId: string | null) => void;
  onPreviewSingleSelected: () => void;
  onEditSingleSelected: () => void;
  onCropSingleSelected: () => void;
  onReplaceSingleSelected: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
}

/** Rendered only when `!selectionMode && selectedCount > 0`. */
export function SelectionCluster({
  busy,
  folders,
  singleSelectedId,
  onMoveSelectedToFolder,
  onPreviewSingleSelected,
  onEditSingleSelected,
  onCropSingleSelected,
  onReplaceSingleSelected,
  onDeleteSelected,
  onClearSelection,
}: SelectionClusterProps) {
  return (
    <div className={`${TOOL_CLUSTER_CLASS} order-2`}>
      <ToolbarDropdown
        wrap="control"
        propKey="media-move-selected"
        tooltipId={PAGEHUB_RTT_GLOBAL_ID}
        tooltipContent="Move selected items"
        placeholder={<TbFolder className="size-4" />}
        value=""
        onChange={(val: string) => onMoveSelectedToFolder(val === "unfiled" ? null : val)}
      >
        <option value="unfiled">Move to Unfiled</option>
        {folders.map(folder => (
          <option key={folder.id} value={folder.id}>
            Move to {folder.name}
          </option>
        ))}
      </ToolbarDropdown>

      {singleSelectedId && (
        <>
          <ToolbarIconButton
            onClick={onPreviewSingleSelected}
            disabled={busy}
            tooltip="Preview selected"
          >
            <TbEye className="size-4" />
          </ToolbarIconButton>
          <ToolbarIconButton
            onClick={onEditSingleSelected}
            disabled={busy}
            tooltip="Edit selected"
          >
            <TbEdit className="size-4" />
          </ToolbarIconButton>
          <ToolbarIconButton
            onClick={onCropSingleSelected}
            disabled={busy}
            tooltip="Crop selected"
          >
            <TbScissors className="size-4" />
          </ToolbarIconButton>
          <ToolbarIconButton
            onClick={onReplaceSingleSelected}
            disabled={busy}
            tooltip="Replace selected"
          >
            <TbRefresh className="size-4" />
          </ToolbarIconButton>
        </>
      )}

      <ToolbarIconButton
        onClick={onDeleteSelected}
        disabled={busy}
        tooltip="Delete selected"
        className="text-error"
      >
        <TbTrash className="size-4" />
      </ToolbarIconButton>
      <ToolbarIconButton onClick={onClearSelection} disabled={busy} tooltip="Clear selection">
        <TbX className="size-4" />
      </ToolbarIconButton>
    </div>
  );
}
