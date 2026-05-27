/**
 * MediaManagerBody — shared body content for the Media Manager picker.
 * Rendered inside both the full Media Manager (SettingsShell) and the slim
 * Background image popover (FloatingPanel). Owns folder rename / delete-folder
 * UI state since both shells host that flow inside the body.
 *
 * The `popover` prop toggles the compact folder dropdown above the toolbar
 * (instead of the sidebar tabs that the modal shell renders separately).
 */
import { ConfirmDialog } from "@/chrome/primitives/layout/ConfirmDialog";
import { useMemo, useState } from "react";
import { TbAlertTriangle, TbFolder, TbX } from "react-icons/tb";
import { ToolbarDropdown } from "../../ToolbarDropdown";
import { MediaEditModal } from "./components/MediaEditModal";
import { MediaGrid } from "./components/MediaGrid";
import { MediaToolbar } from "./components/MediaToolbar/MediaToolbar";
import { getReplaceAccept } from "./utils/media-helpers";
import type { UseMediaManagerReturn } from "./hooks/useMediaManager";

interface MediaManagerBodyProps {
  manager: UseMediaManagerReturn;
  selectionMode: boolean;
  onSelect?: (mediaId: string) => void;
  onClose: () => void;
  /** Compact slim layout — folder dropdown above toolbar, no sidebar tabs.
   *  False = caller's shell renders folder navigation separately (e.g.
   *  SettingsShell sidebar tabs in the full Media Manager). */
  popover: boolean;
}

export function MediaManagerBody({
  manager,
  selectionMode,
  onSelect,
  onClose,
  popover,
}: MediaManagerBodyProps) {
  const [folderNameMode, setFolderNameMode] = useState<"create" | "rename" | null>(null);
  const [folderNameValue, setFolderNameValue] = useState("");
  const [isDeleteFolderConfirmOpen, setIsDeleteFolderConfirmOpen] = useState(false);

  const selectedItems = useMemo(
    () => manager.mediaList.filter(item => manager.selectedMediaIds.includes(item.id)),
    [manager.mediaList, manager.selectedMediaIds]
  );
  const singleSelected = selectedItems.length === 1 ? selectedItems[0] : null;
  const busy =
    manager.uploading || manager.savingMetadata === "saving" || manager.deletingMedia.length > 0;

  const selectedFolder =
    manager.folderFilter !== "all" && manager.folderFilter !== "unfiled"
      ? manager.folders.find(f => f.id === manager.folderFilter) || null
      : null;

  const triggerReplaceForMedia = (mediaId: string) => {
    manager.setReplacingMedia(mediaId);
    const target = manager.mediaList.find(m => m.id === mediaId);
    const input = manager.replaceInputRef.current;
    if (input) {
      input.accept = target ? getReplaceAccept(target) : "*/*";
      input.click();
    }
  };

  const handleCreateFolder = () => {
    setFolderNameMode("create");
    setFolderNameValue("");
  };

  const handleRenameFolder = () => {
    if (!selectedFolder) return;
    setFolderNameMode("rename");
    setFolderNameValue(selectedFolder.name);
  };

  const handleDeleteFolder = () => {
    if (!selectedFolder) return;
    setIsDeleteFolderConfirmOpen(true);
  };

  const handleSubmitFolderName = () => {
    const trimmed = folderNameValue.trim();
    if (!trimmed) return;
    if (folderNameMode === "create") {
      const created = manager.createFolder(trimmed);
      if (created) manager.setFolderFilter(created.id);
    } else if (folderNameMode === "rename" && selectedFolder) {
      manager.renameFolder(selectedFolder.id, trimmed);
    }
    setFolderNameMode(null);
    setFolderNameValue("");
  };

  const handleCancelFolderName = () => {
    setFolderNameMode(null);
    setFolderNameValue("");
  };

  const handleConfirmDeleteFolder = () => {
    if (!selectedFolder) return;
    manager.deleteFolder(selectedFolder.id);
    setIsDeleteFolderConfirmOpen(false);
  };

  return (
    <>
      <div
        className={
          popover
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : "-mx-6 -my-6 flex min-h-0 flex-1 flex-col overflow-hidden"
        }
      >
        {manager.uploadError && (
          <div className="border-error bg-error/10 border-b px-6 py-3">
            <div className="flex items-start gap-3">
              <TbAlertTriangle className="text-error mt-0.5 size-5 shrink-0" />
              <div className="flex-1">
                <p className="text-error text-sm whitespace-pre-line">{manager.uploadError}</p>
              </div>
              <button
                onClick={() => manager.setUploadError(null)}
                className="hover:bg-error/20 shrink-0 rounded p-1 transition-colors"
              >
                <TbX className="text-error size-4" />
              </button>
            </div>
          </div>
        )}

        {popover && (
          <div className="border-base-300 bg-neutral flex items-center gap-2 border-b px-3 py-1.5">
            <span className="text-neutral-content shrink-0 text-[11px]">Folder</span>
            <div className="min-w-0 flex-1">
              <ToolbarDropdown
                wrap="control"
                propKey="media-folder-filter-popover"
                placeholder={<TbFolder className="size-3.5" />}
                value={manager.folderFilter}
                onChange={(val: string) => manager.setFolderFilter(val)}
              >
                <option value="all">All ({manager.folderCounts.all})</option>
                <option value="unfiled">Unfiled ({manager.folderCounts.unfiled})</option>
                {manager.folders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name} ({manager.folderCounts.byId.get(folder.id) || 0})
                  </option>
                ))}
              </ToolbarDropdown>
            </div>
          </div>
        )}

        <MediaToolbar
          manager={manager}
          selectionMode={selectionMode}
          filteredCount={manager.filteredMedia.length}
          totalCount={manager.mediaList.length}
          selectedCount={manager.selectedMediaIds.length}
          busy={busy}
          canRenameOrDeleteFolder={!!selectedFolder}
          onSelectVisible={manager.selectAllVisible}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          folders={manager.folders}
          singleSelectedId={singleSelected?.id ?? null}
          onMoveSelectedToFolder={manager.moveSelectedToFolder}
          onPreviewSingleSelected={() =>
            singleSelected && manager.setPreviewMedia(singleSelected.id)
          }
          onEditSingleSelected={() => singleSelected && manager.openEditModal(singleSelected)}
          onCropSingleSelected={() => singleSelected && manager.setCropMedia(singleSelected)}
          onReplaceSingleSelected={() =>
            singleSelected && triggerReplaceForMedia(singleSelected.id)
          }
          onDeleteSelected={manager.handleDeleteSelected}
          onClearSelection={manager.clearSelection}
        />

        {folderNameMode && !selectionMode && (
          <div className="border-base-300 bg-base-100 flex items-center gap-2 border-b px-3 py-2">
            <div className="input-wrapper input-hover relative flex h-8 min-h-0 flex-1 items-center">
              <input
                type="text"
                value={folderNameValue}
                onChange={e => setFolderNameValue(e.target.value)}
                placeholder={folderNameMode === "create" ? "New folder name" : "Rename folder"}
                className="input-plain-search h-full! min-h-0 px-3"
                autoFocus
                onKeyDown={e => {
                  if (e.key === "Enter") handleSubmitFolderName();
                  if (e.key === "Escape") handleCancelFolderName();
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleSubmitFolderName}
              disabled={!folderNameValue.trim() || busy}
              className="btn btn-primary btn-sm"
            >
              {folderNameMode === "create" ? "Create" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleCancelFolderName}
              disabled={busy}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="min-h-0 min-w-0 flex-1">
          <MediaGrid
            filteredMedia={manager.filteredMedia}
            viewMode={manager.viewMode}
            sortField={manager.sortField}
            selectedMedia={manager.selectedMedia}
            selectedMediaIds={manager.selectedMediaIds}
            deletingMedia={manager.deletingMedia}
            searchQuery={manager.searchQuery}
            uploadProgress={manager.uploadProgress}
            isDragOver={manager.isDragOver}
            dropProps={manager.dropProps}
            selectionMode={selectionMode}
            onSelect={onSelect}
            onClose={onClose}
            onItemSelect={manager.handleMediaSelection}
            onPreview={id => manager.setPreviewMedia(id)}
            onSetAddMode={manager.setAddMode}
            folderNameById={manager.folderNameById}
            fileInputRef={manager.fileInputRef}
          />
        </div>
      </div>

      {manager.editingMedia && (
        <MediaEditModal
          editingMedia={manager.editingMedia}
          savingMetadata={manager.savingMetadata}
          canUseImageAnalyze={manager.canUseImageAnalyze}
          mediaEditAiActionsContext={manager.mediaEditAiActionsContext}
          onClose={manager.closeEditModal}
          onSave={manager.saveEditedMetadata}
          onUpdate={manager.setEditingMedia}
        />
      )}

      <ConfirmDialog
        key="delete-folder-confirm-dialog"
        isOpen={isDeleteFolderConfirmOpen}
        onClose={() => setIsDeleteFolderConfirmOpen(false)}
        onConfirm={handleConfirmDeleteFolder}
        title="Delete Folder"
        message={
          selectedFolder
            ? `Delete folder \"${selectedFolder.name}\"? Items will be moved to Unfiled.`
            : "Delete this folder? Items will be moved to Unfiled."
        }
        confirmText="Delete Folder"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}
