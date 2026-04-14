import { ConfirmDialog } from "@/chrome/primitives/layout/ConfirmDialog";
import ReactDOM from "react-dom";
import { TbAlertTriangle, TbPhoto, TbX } from "react-icons/tb";
import { ImageCropModal } from "../../dialogs/ImageCropModal";
import { MediaEditModal } from "./components/MediaEditModal";
import { MediaGrid } from "./components/MediaGrid";
import { MediaPreviewModal } from "./components/MediaPreviewModal";
import { MediaToolbar } from "./components/MediaToolbar";
import { useMediaManager } from "./hooks/useMediaManager";

interface MediaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (mediaId: string) => void;
  selectionMode?: boolean;
}

export function MediaManagerModal({
  isOpen,
  onClose,
  onSelect,
  selectionMode = false,
}: MediaManagerModalProps) {
  const manager = useMediaManager({ isOpen, onClose, onSelect, selectionMode });

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div
        className="pagehub-sdk-root ph-modal-backdrop ph-modal-backdrop--center z-9997"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          role="dialog"
          aria-modal="true"
          className="pagehub-sdk-root ph-modal-surface relative overflow-hidden"
          style={{
            width: manager.mmWidth,
            height: manager.mmHeight,
          }}
          onClick={e => e.stopPropagation()}
          onKeyDown={e => {
            if (
              (e.key === "Backspace" || e.key === "Escape") &&
              (e.target as HTMLElement).tagName === "INPUT"
            ) {
              e.stopPropagation();
            }
          }}
        >
          {/* Resize handles */}
          {manager.mmHandleProps.e && <div {...manager.mmHandleProps.e} />}
          {manager.mmHandleProps.s && <div {...manager.mmHandleProps.s} />}
          {manager.mmHandleProps.se && <div {...manager.mmHandleProps.se} />}
          {manager.mmHandleProps.w && <div {...manager.mmHandleProps.w} />}
          {manager.mmHandleProps.sw && <div {...manager.mmHandleProps.sw} />}

          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-base-300 bg-accent text-accent-content flex items-center justify-between border-b px-3 py-1.5">
              <div className="flex items-center gap-2">
                <TbPhoto className="text-primary size-4" />
                <span className="text-base-content text-xs font-semibold">
                  {selectionMode ? "Select Media" : "Media Manager"}
                </span>
                <span className="text-neutral-content text-[10px]">
                  {selectionMode
                    ? "Click an image to select it"
                    : `${manager.filteredMedia.length} ${manager.filteredMedia.length === 1 ? "item" : "items"}${manager.searchQuery ? ` (filtered from ${manager.mediaList.length})` : ""}`}
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-neutral-content hover:bg-neutral hover:text-base-content rounded p-0.5"
                title="Close"
              >
                <TbX className="size-3.5" />
              </button>
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
                manager.replaceInputRef.current?.click();
              }}
              onEdit={media => manager.openEditModal(media)}
              onDelete={id => manager.handleDelete(id)}
              onSetAddMode={manager.setAddMode}
              fileInputRef={manager.fileInputRef}
            />
          </div>

          {/* Edit Metadata Modal */}
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
        </div>
      </div>

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

      {/* AVIF Conversion */}
      <ConfirmDialog
        key="avif-convert-dialog"
        isOpen={manager.conversionDialog.isOpen}
        onClose={() => manager.setConversionDialog({ isOpen: false, file: null })}
        onConfirm={manager.handleConvertAndUpload}
        title="Convert AVIF to JPEG?"
        message={`Your CDN doesn't support AVIF uploads. Would you like to convert "${manager.conversionDialog.file?.name}" to JPEG and upload it?`}
        confirmText="Convert & Upload"
        cancelText="Cancel"
      />
    </>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
}
