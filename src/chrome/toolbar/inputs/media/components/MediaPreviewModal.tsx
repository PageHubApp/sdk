import Image from "next/image";
import ReactDOM from "react-dom";
import { useState } from "react";
import { TbChevronLeft, TbChevronRight, TbCopy, TbDownload, TbX } from "react-icons/tb";
import { getCdnUrl } from "@/utils/cdn";
import { formatDimensions } from "@/utils/imageDimensions";
import { formatFileSize, getMediaKind, type MediaItem } from "../utils/media-helpers";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../../../primitives/layout/tooltipSurface";
import { OVERLAY_Z_CRITICAL_MODAL } from "../../../../popovers/overlayZIndex";

interface MediaPreviewModalProps {
  previewMedia: string | null;
  filteredMedia: MediaItem[];
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function MediaPreviewModal({
  previewMedia,
  filteredMedia,
  onClose,
  onPrevious,
  onNext,
}: MediaPreviewModalProps) {
  if (!previewMedia) return null;

  const media = filteredMedia.find(m => m.id === previewMedia);
  if (!media) return null;

  const currentIndex = filteredMedia.findIndex(m => m.id === previewMedia);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < filteredMedia.length - 1;
  const kind = getMediaKind(media);
  const downloadHref =
    media.type === "r2"
      ? media.metadata?.deliveryURL
      : media.type === "url"
        ? media.metadata?.url
        : kind === "image"
          ? getCdnUrl(media.cdnId || media.id, { width: 2048, format: "auto" })
          : undefined;
  const downloadName = media.metadata?.title || media.id;

  return ReactDOM.createPortal(
    <div
      className="animate-backdrop-in fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      style={{ zIndex: OVERLAY_Z_CRITICAL_MODAL }}
      onClick={onClose}
    >
      {/* Header actions */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <CopyIdButton mediaId={media.id} />
        {downloadHref && (
          <a
            href={downloadHref}
            download={downloadName}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Download"
          >
            <TbDownload className="size-6" />
          </a>
        )}
        <button
          onClick={onClose}
          className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Close (ESC)"
        >
          <TbX className="size-6" />
        </button>
      </div>

      {/* Previous */}
      {hasPrevious && (
        <button
          onClick={e => {
            e.stopPropagation();
            onPrevious();
          }}
          className="absolute top-1/2 left-4 z-10 -translate-y-1/2 rounded-lg bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Previous (←)"
        >
          <TbChevronLeft className="size-8" />
        </button>
      )}

      {/* Next */}
      {hasNext && (
        <button
          onClick={e => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute top-1/2 right-4 z-10 -translate-y-1/2 rounded-lg bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Next (→)"
        >
          <TbChevronRight className="size-8" />
        </button>
      )}

      {/* Image */}
      <div
        role="button"
        tabIndex={0}
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {media.type === "svg" ? (
          <div
            className="flex max-h-[90vh] max-w-[90vw] items-center justify-center bg-white/5 p-8 backdrop-blur-sm"
            dangerouslySetInnerHTML={{ __html: media.metadata?.svg || "" }}
          />
        ) : kind === "video" && media.metadata?.deliveryURL ? (
          <video
            src={media.metadata.deliveryURL}
            controls
            playsInline
            className="max-h-[90vh] max-w-[90vw]"
          />
        ) : kind === "audio" && media.metadata?.deliveryURL ? (
          <div className="flex max-w-[90vw] flex-col items-center gap-4 rounded-lg bg-white/5 p-8 backdrop-blur-sm">
            <p className="text-sm text-white/80">{media.metadata?.title || media.id}</p>
            <audio src={media.metadata.deliveryURL} controls className="min-w-[400px]" />
          </div>
        ) : kind === "pdf" && media.metadata?.deliveryURL ? (
          <iframe
            src={media.metadata.deliveryURL}
            title={media.metadata?.title || media.id}
            className="h-[90vh] w-[90vw] bg-white"
          />
        ) : kind !== "image" ? (
          <div className="flex max-w-[90vw] flex-col items-center gap-4 rounded-lg bg-white/5 p-12 text-center backdrop-blur-sm">
            <p className="text-lg text-white">{media.metadata?.title || media.id}</p>
            <p className="text-sm text-white/60">
              {media.metadata?.contentType || "file"} —{" "}
              {media.metadata?.size ? formatFileSize(media.metadata.size) : "unknown size"}
            </p>
            {downloadHref && (
              <a
                href={downloadHref}
                download={downloadName}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="btn btn-primary"
              >
                Download
              </a>
            )}
          </div>
        ) : (
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <Image
              src={
                media.type === "url"
                  ? media.metadata?.url!
                  : getCdnUrl(media.cdnId || media.id, { width: 2000, format: "auto" })
              }
              alt={media.metadata?.alt || media.metadata?.title || media.id}
              width={media.metadata?.dimensions?.width || 1200}
              height={media.metadata?.dimensions?.height || 800}
              className="max-h-[90vh] max-w-[90vw] object-contain"
              quality={90}
            />
          </div>
        )}

        {/* Info overlay — only for image/svg, where controls don't overlap */}
        {(kind === "image" || media.type === "svg") && (
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-4 text-white">
            <h3 className="text-lg font-semibold">{media.metadata?.title || media.id}</h3>
            {media.metadata?.description && (
              <p className="mt-1 text-sm text-white/80">{media.metadata.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/60">
              {media.metadata?.dimensions && (
                <span>{formatDimensions(media.metadata.dimensions)}</span>
              )}
              {media.metadata?.size && <span>{formatFileSize(media.metadata.size)}</span>}
              {media.metadata?.contentType && <span>{media.metadata.contentType}</span>}
              {media.uploadedAt && <span>{new Date(media.uploadedAt).toLocaleDateString()}</span>}
              <span>
                {currentIndex + 1} / {filteredMedia.length}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
}

function CopyIdButton({ mediaId }: { mediaId: string }) {
  const [copied, setCopied] = useState(false);
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(mediaId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleClick}
      className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      title={copied ? "Copied!" : "Copy media ID"}
    >
      <TbCopy className="size-6" />
    </button>
  );
}
