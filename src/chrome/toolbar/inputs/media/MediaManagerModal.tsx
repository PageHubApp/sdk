import { ConfirmDialog } from "@/chrome/primitives/layout/ConfirmDialog";
import { SettingsShell } from "@/chrome/viewport/settings/SettingsShell";
import { useEditorSidebarDockLeft } from "@/utils/lib";
import { useEffect, useMemo, useState } from "react";
import {
  TbAlertTriangle,
  TbFolder,
  TbEdit,
  TbEye,
  TbRefresh,
  TbScissors,
  TbTrash,
  TbX,
} from "react-icons/tb";
import { ImageCropModal } from "../../dialogs/ImageCropModal";
import { MediaEditModal } from "./components/MediaEditModal";
import { MediaGrid } from "./components/MediaGrid";
import { MediaPreviewModal } from "./components/MediaPreviewModal";
import { MediaToolbar } from "./components/MediaToolbar";
import { useMediaManager } from "./hooks/useMediaManager";
import {
  getReplaceAccept,
  type MediaKind,
} from "./utils/media-helpers";

interface MediaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (mediaId: string) => void;
  selectionMode?: boolean;
  /** Restrict the picker to a single media kind (e.g. only videos for a Video
   *  component picker). User can still flip the "All" tab to widen. */
  kindFilter?: MediaKind;
}

const MEDIA_MANAGER_DEFAULT_WIDTH = 1080;
const MEDIA_MANAGER_Z = 10050;
export function MediaManagerModal({
  isOpen,
  onClose,
  onSelect,
  selectionMode = false,
  kindFilter,
}: MediaManagerModalProps) {
  const manager = useMediaManager({ isOpen, onClose, onSelect, selectionMode });
  const [folderNameMode, setFolderNameMode] = useState<"create" | "rename" | null>(null);
  const [folderNameValue, setFolderNameValue] = useState("");
  const [isDeleteFolderConfirmOpen, setIsDeleteFolderConfirmOpen] = useState(false);

  const toolbarDockedLeft = useEditorSidebarDockLeft();
  const dockEdge: "left" | "right" = toolbarDockedLeft ? "left" : "right";
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const defaultHeight = Math.max(560, Math.min(760, Math.round(viewportHeight * 0.78)));
  const maxHeight = Math.max(640, Math.min(860, Math.round(viewportHeight * 0.9)));

  useEffect(() => {
    if (!isOpen) return;
    const nextKind = kindFilter ?? "all";
    if (manager.kindFilter !== nextKind) {
      manager.setKindFilter(nextKind);
    }
  }, [isOpen, kindFilter, manager.kindFilter, manager.setKindFilter]);

  const selectedItems = useMemo(
    () => manager.mediaList.filter(item => manager.selectedMediaIds.includes(item.id)),
    [manager.mediaList, manager.selectedMediaIds]
  );
  const singleSelected = selectedItems.length === 1 ? selectedItems[0] : null;
  const busy =
    manager.uploading || manager.savingMetadata === "saving" || manager.deletingMedia.length > 0;

  const folderTabs = useMemo(
    () => [
      {
        key: "folder:all",
        label: `All (${manager.folderCounts.all})`,
        icon: <TbFolder />,
      },
      {
        key: "folder:unfiled",
        label: `Unfiled (${manager.folderCounts.unfiled})`,
        icon: <TbFolder />,
      },
      ...manager.folders.map(folder => ({
        key: `folder:${folder.id}`,
        label: `${folder.name} (${manager.folderCounts.byId.get(folder.id) || 0})`,
        icon: <TbFolder />,
      })),
    ],
    [manager.folderCounts.all, manager.folderCounts.byId, manager.folderCounts.unfiled, manager.folders]
  );

  const activeFolderTab =
    manager.folderFilter === "all"
      ? "folder:all"
      : manager.folderFilter === "unfiled"
        ? "folder:unfiled"
        : `folder:${manager.folderFilter}`;

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

  const selectedFolder =
    manager.folderFilter !== "all" && manager.folderFilter !== "unfiled"
      ? manager.folders.find(f => f.id === manager.folderFilter) || null
      : null;

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
      <SettingsShell
        isOpen={isOpen}
        onClose={onClose}
        title={selectionMode ? "Select Media" : "Media Manager"}
        storageKey="media-manager-v3"
        tabs={folderTabs}
        activeTab={activeFolderTab}
        setActiveTab={key => {
          const raw = String(key).replace(/^folder:/, "");
          manager.setFolderFilter(raw === "all" || raw === "unfiled" ? raw : raw);
        }}
        defaultWidth={MEDIA_MANAGER_DEFAULT_WIDTH}
        defaultHeight={defaultHeight}
        minWidth={760}
        maxWidth={1400}
        minHeight={500}
        maxHeight={maxHeight}
        dockToEdge={dockEdge}
        zIndex={MEDIA_MANAGER_Z}
      >
        <div className="-mx-6 -my-6 flex min-h-0 flex-1 flex-col overflow-hidden">
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
            onPreviewSingleSelected={() => singleSelected && manager.setPreviewMedia(singleSelected.id)}
            onEditSingleSelected={() => singleSelected && manager.openEditModal(singleSelected)}
            onCropSingleSelected={() => singleSelected && manager.setCropMedia(singleSelected)}
            onReplaceSingleSelected={() => singleSelected && triggerReplaceForMedia(singleSelected.id)}
            onDeleteSelected={manager.handleDeleteSelected}
            onClearSelection={manager.clearSelection}
          />

          {folderNameMode && !selectionMode && (
            <div className="border-base-300 bg-base-100 flex items-center gap-2 border-b px-3 py-2">
              <input
                type="text"
                value={folderNameValue}
                onChange={e => setFolderNameValue(e.target.value)}
                placeholder={folderNameMode === "create" ? "New folder name" : "Rename folder"}
                className="input-dialog h-8 min-h-8 flex-1"
                autoFocus
                onKeyDown={e => {
                  if (e.key === "Enter") handleSubmitFolderName();
                  if (e.key === "Escape") handleCancelFolderName();
                }}
              />
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
            renderMediaEditAiActions={manager.renderMediaEditAiActions}
            onClose={manager.closeEditModal}
            onSave={manager.saveEditedMetadata}
            onUpdate={manager.setEditingMedia}
          />
        )}
      </SettingsShell>

      <MediaPreviewModal
        previewMedia={manager.previewMedia}
        filteredMedia={manager.filteredMedia}
        onClose={() => manager.setPreviewMedia(null)}
        onPrevious={manager.handlePreviewPrevious}
        onNext={manager.handlePreviewNext}
      />

      <ImageCropModal
        key="image-crop-modal"
        isOpen={manager.cropMedia !== null}
        onClose={() => manager.setCropMedia(null)}
        media={manager.cropMedia}
        onSave={manager.handleSaveCroppedImage}
        settings={manager.settings}
      />

      <ConfirmDialog
        key="delete-confirm-dialog"
        isOpen={manager.deleteConfirm.isOpen}
        onClose={() => manager.setDeleteConfirm({ isOpen: false, mediaIds: [] })}
        onConfirm={manager.confirmDelete}
        title="Delete Media"
        message={
          manager.deleteConfirm.mediaIds.length > 1
            ? `Are you sure you want to delete ${manager.deleteConfirm.mediaIds.length} media items? This action cannot be undone.`
            : "Are you sure you want to delete this media item? This action cannot be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

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
