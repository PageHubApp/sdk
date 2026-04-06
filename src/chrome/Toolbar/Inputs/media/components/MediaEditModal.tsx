import Image from "next/image";
import { TbCheck, TbEdit, TbLoader2, TbSparkles, TbX } from "react-icons/tb";
import { getCdnUrl } from "utils/cdn";
import { formatDimensions } from "utils/imageDimensions";
import { formatFileSize, type MediaItem } from "../utils/media-helpers";

const BLUR_PLACEHOLDER =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

interface MediaEditModalProps {
  editingMedia: MediaItem;
  savingMetadata: "idle" | "saving" | "saved";
  isGeneratingMetadata: boolean;
  canUseImageAnalyze: boolean;
  onClose: () => void;
  onSave: () => void;
  onGenerateMetadata: () => void;
  onUpdate: (media: MediaItem) => void;
}

export function MediaEditModal({
  editingMedia,
  savingMetadata,
  isGeneratingMetadata,
  canUseImageAnalyze,
  onClose,
  onSave,
  onGenerateMetadata,
  onUpdate,
}: MediaEditModalProps) {
  const updateField = (field: string, value: string) => {
    onUpdate({
      ...editingMedia,
      metadata: { ...editingMedia.metadata, [field]: value },
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="absolute inset-0 flex items-center justify-center bg-background/60 text-muted-foreground backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="pagehub-sdk-root ph-modal-surface-heavy flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-6">
          <h3 className="text-xl font-bold text-foreground">Edit Media</h3>
          <button
            onClick={onClose}
            className="text-xl text-muted-foreground hover:text-foreground"
          >
            <TbX />
          </button>
        </div>

        {/* Body */}
        <div className="scrollbar-light relative flex-1 space-y-4 overflow-y-auto p-6">
          {/* Preview */}
          <div className="flex items-center gap-4 rounded-lg border border-border bg-muted p-4 text-muted-foreground">
            {editingMedia.type === "url" ? (
              <div className="relative size-24 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={editingMedia.metadata?.url!}
                  alt={editingMedia.metadata?.alt || "Preview"}
                  width={96}
                  height={96}
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL={BLUR_PLACEHOLDER}
                />
              </div>
            ) : editingMedia.type === "svg" ? (
              <div
                className="flex size-24 items-center justify-center rounded-lg border border-border"
                dangerouslySetInnerHTML={{ __html: editingMedia.metadata?.svg || "" }}
              />
            ) : (
              <div className="relative size-24 overflow-hidden rounded-lg bg-muted">
                <Image
                  key={`${editingMedia.id}-${editingMedia.uploadedAt || 0}`}
                  src={getCdnUrl(editingMedia.cdnId || editingMedia.id, {
                    width: 200,
                    format: "auto",
                  })}
                  alt={editingMedia.metadata?.alt || "Preview"}
                  width={96}
                  height={96}
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL={BLUR_PLACEHOLDER}
                />
              </div>
            )}
            <div className="flex-1">
              <p className="font-mono text-sm text-muted-foreground">{editingMedia.id}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Type: {editingMedia.type || "cdn"}
              </p>
              {editingMedia.metadata?.size && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Size: {formatFileSize(editingMedia.metadata.size)}
                </p>
              )}
              {editingMedia.metadata?.dimensions && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Dimensions: {formatDimensions(editingMedia.metadata.dimensions)}
                </p>
              )}
            </div>
          </div>

          {/* URL field */}
          {editingMedia.type === "url" && (
            <div>
              <label htmlFor="edit-image-url" className="toolbar-label mb-2 block font-medium">
                Image URL <span className="text-destructive">*</span>
              </label>
              <input
                id="edit-image-url"
                type="text"
                value={editingMedia.metadata?.url || ""}
                onChange={e => updateField("url", e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="input placeholder:text-muted-foreground"
              />
            </div>
          )}

          {/* SVG field */}
          {editingMedia.type === "svg" && (
            <div>
              <label htmlFor="edit-svg-code" className="toolbar-label mb-2 block font-medium">
                SVG Code <span className="text-destructive">*</span>
              </label>
              <textarea
                id="edit-svg-code"
                value={editingMedia.metadata?.svg || ""}
                onChange={e => updateField("svg", e.target.value)}
                placeholder="<svg>...</svg>"
                className="input min-h-[8rem] resize-none font-mono text-sm placeholder:text-muted-foreground"
                rows={6}
              />
            </div>
          )}

          {/* File Name */}
          <div>
            <label htmlFor="edit-file-name" className="toolbar-label mb-2 block font-medium">
              File Name
            </label>
            <input
              id="edit-file-name"
              type="text"
              value={editingMedia.metadata?.title || ""}
              onChange={e => updateField("title", e.target.value)}
              placeholder="Enter file name"
              className="input placeholder:text-muted-foreground"
            />
          </div>

          {/* Alt Text */}
          <div>
            <label htmlFor="edit-alt-text" className="toolbar-label mb-2 block font-medium">
              Alt Text <span className="text-destructive">*</span>
            </label>
            <input
              id="edit-alt-text"
              type="text"
              value={editingMedia.metadata?.alt || ""}
              onChange={e => updateField("alt", e.target.value)}
              placeholder="Describe the image for accessibility"
              className="input placeholder:text-muted-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Important for accessibility and SEO
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="edit-description" className="toolbar-label mb-2 block font-medium">
              Description
            </label>
            <textarea
              id="edit-description"
              value={editingMedia.metadata?.description || ""}
              onChange={e => updateField("description", e.target.value)}
              placeholder="Additional details about this media"
              rows={3}
              className="input min-h-[4.5rem] resize-none placeholder:text-muted-foreground"
            />
          </div>

          {/* AI Metadata */}
          {canUseImageAnalyze && editingMedia.type !== "svg" && (
            <div className="border-t border-border pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="toolbar-label font-medium">
                  AI Metadata Generation
                </span>
                <button
                  type="button"
                  onClick={onGenerateMetadata}
                  disabled={isGeneratingMetadata}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {isGeneratingMetadata ? (
                    <>
                      <TbLoader2 className="size-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <TbSparkles className="size-4" />
                      Generate with AI
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border bg-muted p-6 text-muted-foreground">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              onSave();
            }}
            disabled={savingMetadata !== "idle"}
            className={`btn btn-primary flex items-center gap-2 ${
              savingMetadata === "saving" ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            {savingMetadata === "saving" ? (
              <>
                <TbLoader2 className="animate-spin" />
                Saving...
              </>
            ) : savingMetadata === "saved" ? (
              <>
                <TbCheck />
                Saved
              </>
            ) : (
              <>
                <TbEdit />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
