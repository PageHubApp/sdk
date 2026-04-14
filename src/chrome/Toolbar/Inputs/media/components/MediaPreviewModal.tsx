import Image from "next/image";
import { TbChevronLeft, TbChevronRight, TbX } from "react-icons/tb";
import { getCdnUrl } from "@/utils/cdn";
import { formatDimensions } from "@/utils/imageDimensions";
import { formatFileSize, type MediaItem } from "../utils/media-helpers";

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

  return (
    <div
      className="animate-backdrop-in fixed inset-0 z-9999 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        title="Close (ESC)"
      >
        <TbX className="size-6" />
      </button>

      {/* Previous */}
      {hasPrevious && (
        <button
          onClick={e => {
            e.stopPropagation();
            onPrevious();
          }}
          className="absolute top-1/2 left-4 z-10 -translate-y-1/2 rounded-lg bg-white/10 p-3 text-white transition-colors hover:bg-white/20"
          title="Previous (←)"
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
          title="Next (→)"
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

        {/* Info overlay */}
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
            {media.uploadedAt && <span>{new Date(media.uploadedAt).toLocaleDateString()}</span>}
            <span>
              {currentIndex + 1} / {filteredMedia.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
