import { ConfirmDialog } from "@/chrome/primitives/layout/ConfirmDialog";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { SettingsShell } from "@/chrome/viewport/settings/SettingsShell";
import { useEditorSidebarDockLeft } from "@/utils/lib";
import { useEffect, useMemo } from "react";
import {
  TbAlertTriangle,
  TbArchive,
  TbEdit,
  TbFile,
  TbFileMusic,
  TbFileTypePdf,
  TbPhoto,
  TbRefresh,
  TbScissors,
  TbStack2,
  TbTrash,
  TbVideo,
  TbX,
} from "react-icons/tb";
import { ImageCropModal } from "../../dialogs/ImageCropModal";
import { MediaEditModal } from "./components/MediaEditModal";
import { MediaGrid } from "./components/MediaGrid";
import { MediaPreviewModal } from "./components/MediaPreviewModal";
import { MediaToolbar } from "./components/MediaToolbar";
import { useMediaManager } from "./hooks/useMediaManager";
import {
  getMediaKind,
  getReplaceAccept,
  MEDIA_KIND_LABELS,
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
const KIND_ORDER: MediaKind[] = ["image", "video", "audio", "pdf", "archive", "other"];
const KIND_ICONS: Record<MediaKind, React.ReactNode> = {
  image: <TbPhoto />,
  video: <TbVideo />,
  audio: <TbFileMusic />,
  pdf: <TbFileTypePdf />,
  archive: <TbArchive />,
  other: <TbFile />,
};

export function MediaManagerModal({
  isOpen,
  onClose,
  onSelect,
  selectionMode = false,
  kindFilter,
}: MediaManagerModalProps) {
  const manager = useMediaManager({ isOpen, onClose, onSelect, selectionMode });

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

  const kindTabs = useMemo(() => {
    const counts = new Map<MediaKind, number>();
    for (const m of manager.mediaList) {
      const k = getMediaKind(m);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const present = KIND_ORDER.filter(k => (counts.get(k) ?? 0) > 0);
    return [
      {
        key: "all",
        label: `All (${manager.mediaList.length})`,
        icon: <TbStack2 />,
      },
      ...present.map(k => ({
        key: k,
        label: `${MEDIA_KIND_LABELS[k]} (${counts.get(k)})`,
        icon: KIND_ICONS[k],
      })),
    ];
  }, [manager.mediaList]);

  const triggerReplaceForMedia = (mediaId: string) => {
    manager.setReplacingMedia(mediaId);
    const target = manager.mediaList.find(m => m.id === mediaId);
    const input = manager.replaceInputRef.current;
    if (input) {
      input.accept = target ? getReplaceAccept(target) : "*/*";
      input.click();
    }
  };

  return (
    <>
      <SettingsShell
        isOpen={isOpen}
        onClose={onClose}
        title={selectionMode ? "Select Media" : "Media Manager"}
        storageKey="media-manager-v3"
        tabs={kindTabs}
        activeTab={manager.kindFilter}
        setActiveTab={key => manager.setKindFilter(key as MediaKind | "all")}
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
          <div className="border-base-300 bg-neutral text-neutral-content flex items-center gap-2 border-b px-4 py-1.5 text-[11px]">
            {selectionMode
              ? "Click an item to select it"
              : `${manager.filteredMedia.length} ${manager.filteredMedia.length === 1 ? "item" : "items"}${manager.searchQuery ? ` (filtered from ${manager.mediaList.length})` : ""}`}
          </div>

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

          <MediaToolbar manager={manager} />

          {!selectionMode && (
            <div className="border-base-300 bg-base-100 flex items-center gap-2 border-b px-3 py-2">
              <span className="text-base-content text-sm font-medium">
                {manager.selectedMediaIds.length
                  ? `${manager.selectedMediaIds.length} selected`
                  : "No selection"}
              </span>

              <select
                value=""
                onChange={e => {
                  if (!e.target.value) return;
                  manager.moveSelectedToFolder(
                    e.target.value === "unfiled" ? null : e.target.value
                  );
                  e.currentTarget.value = "";
                }}
                disabled={!manager.selectedMediaIds.length || busy}
                className="select select-sm min-w-[12rem]"
              >
                <option value="">Move to folder…</option>
                <option value="unfiled">Unfiled</option>
                {manager.folders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => singleSelected && manager.setPreviewMedia(singleSelected.id)}
                disabled={!singleSelected || busy}
                className="btn btn-sm"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => singleSelected && manager.openEditModal(singleSelected)}
                disabled={!singleSelected || busy}
                className="btn btn-sm"
              >
                <TbEdit className="size-4" /> Edit
              </button>
              <button
                type="button"
                onClick={() => singleSelected && manager.setCropMedia(singleSelected)}
                disabled={!singleSelected || busy}
                className="btn btn-sm"
              >
                <TbScissors className="size-4" /> Crop
              </button>
              <button
                type="button"
                onClick={() => singleSelected && triggerReplaceForMedia(singleSelected.id)}
                disabled={!singleSelected || busy}
                className="btn btn-sm"
              >
                <TbRefresh className="size-4" /> Replace
              </button>
              <button
                type="button"
                onClick={() => manager.handleDeleteSelected()}
                disabled={!manager.selectedMediaIds.length || busy}
                className="btn btn-sm btn-error"
              >
                <TbTrash className="size-4" /> Delete
              </button>
              <button
                type="button"
                onClick={manager.clearSelection}
                disabled={!manager.selectedMediaIds.length || busy}
                className="btn btn-sm btn-ghost"
              >
                Clear
              </button>

              {manager.filteredMedia.length > 0 && (
                <button
                  type="button"
                  onClick={manager.selectAllVisible}
                  disabled={busy}
                  className="btn btn-sm btn-ghost ml-auto"
                  data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                  data-tooltip-content="Select all items in current view"
                  data-tooltip-place="top"
                >
                  Select visible
                </button>
              )}
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
    </>
  );
}
