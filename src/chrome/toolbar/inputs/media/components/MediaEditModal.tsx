import Image from "next/image";
import ReactDOM from "react-dom";
import { TbCheck, TbEdit, TbLoader2, TbX } from "react-icons/tb";
import { getCdnUrl } from "@/utils/cdn";
import { formatDimensions } from "@/utils/imageDimensions";
import type { ReactNode } from "react";
import type { PageHubMediaEditAiActionsContext } from "@/types";
import { formatFileSize, type MediaItem } from "../utils/media-helpers";
import { OVERLAY_Z_CRITICAL_MODAL } from "@/chrome/overlays/overlayZIndex";

const BLUR_PLACEHOLDER =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

interface MediaEditModalProps {
  editingMedia: MediaItem;
  savingMetadata: "idle" | "saving" | "saved";
  canUseImageAnalyze: boolean;
  mediaEditAiActionsContext: PageHubMediaEditAiActionsContext | null;
  renderMediaEditAiActions?: (ctx: PageHubMediaEditAiActionsContext) => ReactNode;
  onClose: () => void;
  onSave: () => void;
  onUpdate: (media: MediaItem) => void;
}

export function MediaEditModal({
  editingMedia,
  savingMetadata,
  canUseImageAnalyze,
  mediaEditAiActionsContext,
  renderMediaEditAiActions,
  onClose,
  onSave,
  onUpdate,
}: MediaEditModalProps) {
  const updateField = (field: string, value: string) => {
    onUpdate({
      ...editingMedia,
      metadata: { ...editingMedia.metadata, [field]: value },
    });
  };

  return ReactDOM.createPortal(
    <div
      role="button"
      tabIndex={0}
      className="bg-base-100/60 text-neutral-content fixed inset-0 flex items-center justify-center backdrop-blur-sm"
      style={{ zIndex: OVERLAY_Z_CRITICAL_MODAL }}
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
        <div className="border-base-300 flex items-center justify-between border-b p-6">
          <h3 className="text-base-content text-xl font-bold">Edit Media</h3>
          <button
            onClick={onClose}
            className="text-neutral-content hover:text-base-content text-xl"
          >
            <TbX />
          </button>
        </div>

        {/* Body */}
        <div className="scrollbar-light relative flex-1 space-y-4 overflow-y-auto p-6">
          {/* Preview */}
          <div className="border-base-300 bg-neutral text-neutral-content flex items-center gap-4 rounded-lg border p-4">
            {editingMedia.type === "url" ? (
              <div className="bg-neutral relative size-24 overflow-hidden rounded-lg">
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
                className="border-base-300 flex size-24 items-center justify-center rounded-lg border"
                dangerouslySetInnerHTML={{ __html: editingMedia.metadata?.svg || "" }}
              />
            ) : (
              <div className="bg-neutral relative size-24 overflow-hidden rounded-lg">
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
              <p className="text-neutral-content font-mono text-sm">{editingMedia.id}</p>
              <p className="text-neutral-content mt-1 text-xs">
                Type: {editingMedia.type || "cdn"}
              </p>
              {editingMedia.metadata?.size && (
                <p className="text-neutral-content mt-1 text-xs">
                  Size: {formatFileSize(editingMedia.metadata.size)}
                </p>
              )}
              {editingMedia.metadata?.dimensions && (
                <p className="text-neutral-content mt-1 text-xs">
                  Dimensions: {formatDimensions(editingMedia.metadata.dimensions)}
                </p>
              )}
            </div>
          </div>

          {/* URL field */}
          {editingMedia.type === "url" && (
            <div>
              <label htmlFor="edit-image-url" className="toolbar-label mb-2 block font-medium">
                Image URL <span className="text-error">*</span>
              </label>
              <input
                id="edit-image-url"
                type="text"
                value={editingMedia.metadata?.url || ""}
                onChange={e => updateField("url", e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="input placeholder:text-neutral-content"
              />
            </div>
          )}

          {/* SVG field */}
          {editingMedia.type === "svg" && (
            <div>
              <label htmlFor="edit-svg-code" className="toolbar-label mb-2 block font-medium">
                SVG Code <span className="text-error">*</span>
              </label>
              <textarea
                id="edit-svg-code"
                value={editingMedia.metadata?.svg || ""}
                onChange={e => updateField("svg", e.target.value)}
                placeholder="<svg>...</svg>"
                className="input placeholder:text-neutral-content min-h-[8rem] resize-none font-mono text-sm"
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
              className="input placeholder:text-neutral-content"
            />
          </div>

          {/* Alt Text */}
          <div>
            <label htmlFor="edit-alt-text" className="toolbar-label mb-2 block font-medium">
              Alt Text <span className="text-error">*</span>
            </label>
            <input
              id="edit-alt-text"
              type="text"
              value={editingMedia.metadata?.alt || ""}
              onChange={e => updateField("alt", e.target.value)}
              placeholder="Describe the image for accessibility"
              className="input placeholder:text-neutral-content"
            />
            <p className="text-neutral-content mt-1 text-xs">Important for accessibility and SEO</p>
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
              className="input placeholder:text-neutral-content min-h-[4.5rem] resize-none"
            />
          </div>

          {/* AI Metadata */}
          {canUseImageAnalyze && editingMedia.type !== "svg" && mediaEditAiActionsContext && (
            <div className="border-base-300 border-t pt-4">
              {renderMediaEditAiActions?.(mediaEditAiActionsContext)}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-base-300 bg-neutral text-neutral-content flex justify-end gap-3 border-t p-6">
          <button type="button" onClick={onClose} className="btn btn-secondary">
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
    </div>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
}
