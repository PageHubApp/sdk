import { TbCheckbox, TbEdit, TbFolderPlus, TbTrash } from "react-icons/tb";
import { TOOL_CLUSTER_CLASS } from "./styles";
import { ToolbarIconButton } from "./ToolbarIconButton";

interface FolderClusterProps {
  filteredCount: number;
  busy: boolean;
  canRenameOrDeleteFolder: boolean;
  onSelectVisible: () => void;
  onCreateFolder: () => void;
  onRenameFolder: () => void;
  onDeleteFolder: () => void;
}

/** Rendered only when `!selectionMode`. */
export function FolderCluster({
  filteredCount,
  busy,
  canRenameOrDeleteFolder,
  onSelectVisible,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderClusterProps) {
  return (
    <div className={`${TOOL_CLUSTER_CLASS} order-2`}>
      {filteredCount > 0 && (
        <ToolbarIconButton
          onClick={onSelectVisible}
          disabled={busy}
          tooltip="Select all items in current view"
        >
          <TbCheckbox className="size-4" />
        </ToolbarIconButton>
      )}
      <ToolbarIconButton onClick={onCreateFolder} disabled={busy} tooltip="Create folder">
        <TbFolderPlus className="size-4" />
      </ToolbarIconButton>
      <ToolbarIconButton
        onClick={onRenameFolder}
        disabled={!canRenameOrDeleteFolder || busy}
        tooltip="Rename selected folder tab"
      >
        <TbEdit className="size-4" />
      </ToolbarIconButton>
      <ToolbarIconButton
        onClick={onDeleteFolder}
        disabled={!canRenameOrDeleteFolder || busy}
        tooltip="Delete selected folder tab"
        className="text-error"
      >
        <TbTrash className="size-4" />
      </ToolbarIconButton>
    </div>
  );
}
