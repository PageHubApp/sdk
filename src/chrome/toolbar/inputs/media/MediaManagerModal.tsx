import { ConfirmDialog } from "@/chrome/primitives/layout/ConfirmDialog";
import { SettingsShell } from "@/chrome/viewport/settings/SettingsShell";
import { useEditorSidebarDockLeft } from "@/utils/lib";
import { useEffect, useMemo } from "react";
import {
  TbAlertTriangle,
  TbArchive,
  TbFile,
  TbFileMusic,
  TbFileTypePdf,
  TbPhoto,
  TbStack2,
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

const MEDIA_MANAGER_DEFAULT_WIDTH = 960;
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

  // Match SiteSettings: panel docks to the SAME side as the sidebar toolbar.
  const toolbarDockedLeft = useEditorSidebarDockLeft();
  const dockEdge: "left" | "right" = toolbarDockedLeft ? "left" : "right";
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const defaultHeight = Math.max(520, Math.min(680, Math.round(viewportHeight * 0.72)));
  const maxHeight = Math.max(600, Math.min(820, Math.round(viewportHeight * 0.86)));

  useEffect(() => {
    if (isOpen && kindFilter) manager.setKindFilter(kindFilter);
  }, [isOpen, kindFilter]);

  // Kind tabs: "All" + each present kind. Counts shown inline.
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

  return (
    <>
      <SettingsShell
        isOpen={isOpen}
        onClose={onClose}
        title={selectionMode ? "Select Media" : "Media Manager"}
        storageKey="media-manager-v2"
        tabs={kindTabs}
        activeTab={manager.kindFilter}
        setActiveTab={key => manager.setKindFilter(key as MediaKind | "all")}
        defaultWidth={MEDIA_MANAGER_DEFAULT_WIDTH}
        defaultHeight={defaultHeight}
        minWidth={640}
        maxWidth={1280}
        minHeight={420}
        maxHeight={maxHeight}
        dockToEdge={dockEdge}
        zIndex={MEDIA_MANAGER_Z}
      >
        <div className="-mx-6 -my-6 flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Subheader — count / filtered hint */}
          <div className="border-base-300 bg-neutral text-neutral-content flex items-center gap-2 border-b px-4 py-1.5 text-[11px]">
            {selectionMode
              ? "Click an item to select it"
              : `${manager.filteredMedia.length} ${manager.filteredMedia.length === 1 ? "item" : "items"}${manager.searchQuery ? ` (filtered from ${manager.mediaList.length})` : ""}`}
          </div>

          {/* Upload Error Banner */}
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

          {/* Toolbar */}
          <MediaToolbar manager={manager} />

          {/* Content Grid */}
          <MediaGrid
            filteredMedia={manager.filteredMedia}
            mediaList={manager.mediaList}
            viewMode={manager.viewMode}
            sortField={manager.sortField}
            selectedMedia={manager.selectedMedia}
            deletingMedia={manager.deletingMedia}
            searchQuery={manager.searchQuery}
            uploadProgress={manager.uploadProgress}
            isDragOver={manager.isDragOver}
            dropProps={manager.dropProps}
            selectionMode={selectionMode}
            onSelect={onSelect}
            onClose={onClose}
            onSetSelected={manager.setSelectedMedia}
            onPreview={id => manager.setPreviewMedia(id)}
            onCrop={media => manager.setCropMedia(media)}
            onReplace={id => {
              manager.setReplacingMedia(id);
              const target = manager.mediaList.find(m => m.id === id);
              const input = manager.replaceInputRef.current;
              if (input) {
                input.accept = target ? getReplaceAccept(target) : "*/*";
                input.click();
              }
            }}
            onEdit={media => manager.openEditModal(media)}
            onDelete={id => manager.handleDelete(id)}
            onSetAddMode={manager.setAddMode}
            fileInputRef={manager.fileInputRef}
          />
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

      {/* Preview Modal */}
      <MediaPreviewModal
        previewMedia={manager.previewMedia}
        filteredMedia={manager.filteredMedia}
        onClose={() => manager.setPreviewMedia(null)}
        onPrevious={manager.handlePreviewPrevious}
        onNext={manager.handlePreviewNext}
      />

      {/* Image Crop Modal */}
      <ImageCropModal
        key="image-crop-modal"
        isOpen={manager.cropMedia !== null}
        onClose={() => manager.setCropMedia(null)}
        media={manager.cropMedia}
        onSave={manager.handleSaveCroppedImage}
        settings={manager.settings}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        key="delete-confirm-dialog"
        isOpen={manager.deleteConfirm.isOpen}
        onClose={() => manager.setDeleteConfirm({ isOpen: false, mediaId: null })}
        onConfirm={manager.confirmDelete}
        title="Delete Media"
        message="Are you sure you want to delete this media item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}
