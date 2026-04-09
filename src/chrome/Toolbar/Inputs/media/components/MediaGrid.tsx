import Image from "next/image";
import {
  TbCheck,
  TbCode,
  TbCrop,
  TbEdit,
  TbExternalLink,
  TbFolder,
  TbInfoCircle,
  TbLoader2,
  TbRefresh,
  TbSearch,
  TbEye,
  TbTrash,
  TbUpload,
} from "react-icons/tb";
import { getCdnUrl } from "utils/cdn";
import { formatDimensions } from "utils/imageDimensions";
import { formatFileSize, type MediaItem, type SortField, type UploadProgress } from "../utils/media-helpers";

const BLUR_PLACEHOLDER =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

interface MediaGridProps {
  filteredMedia: MediaItem[];
  mediaList: MediaItem[];
  viewMode: "cards" | "list";
  sortField: SortField;
  selectedMedia: string | null;
  deletingMedia: string[];
  searchQuery: string;
  uploadProgress: UploadProgress | null;
  isDragOver: boolean;
  dropProps: Record<string, unknown>;
  selectionMode: boolean;
  onSelect: ((mediaId: string) => void) | undefined;
  onClose: () => void;
  onSetSelected: (id: string | null) => void;
  onPreview: (id: string) => void;
  onCrop: (media: MediaItem) => void;
  onReplace: (id: string) => void;
  onEdit: (media: MediaItem) => void;
  onDelete: (id: string) => void;
  onSetAddMode: (mode: "upload" | "url" | "svg" | "ai") => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export function MediaGrid({
  filteredMedia,
  mediaList,
  viewMode,
  sortField,
  selectedMedia,
  deletingMedia,
  searchQuery,
  uploadProgress,
  isDragOver,
  dropProps,
  selectionMode,
  onSelect,
  onClose,
  onSetSelected,
  onPreview,
  onCrop,
  onReplace,
  onEdit,
  onDelete,
  onSetAddMode,
  fileInputRef,
}: MediaGridProps) {
  return (
    <div
      className={`scrollbar-light relative flex-1 overflow-y-auto bg-base-100 transition-colors ${
        isDragOver ? "border-2 border-dashed border-accent bg-accent" : ""
      } ${uploadProgress ? "pt-16" : "p-3"}`}
      {...dropProps}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-40 flex items-center justify-center rounded-lg border-2 border-dashed border-accent bg-base-100/75 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 text-accent-content">
            <TbUpload className="text-6xl" />
            <div className="text-center">
              <p className="text-xl font-semibold">Drop files here</p>
              <p className="text-sm opacity-75">Release to upload multiple images</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload progress */}
      {uploadProgress && (
        <div className="absolute inset-x-0 top-0 z-30 border-b border-base-300 bg-base-100 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <span className="text-sm font-medium text-base-content">
                Uploading {uploadProgress.current + 1} of {uploadProgress.total} files
              </span>
            </div>
            <span className="text-xs text-neutral-content">
              {Math.round(((uploadProgress.current + 1) / uploadProgress.total) * 100)}%
            </span>
          </div>
          <div className="mb-2 h-2 w-full rounded-full bg-neutral text-neutral-content">
            <div
              className="h-2 rounded-full bg-accent text-accent-content transition-all duration-300 ease-out"
              style={{
                width: `${((uploadProgress.current + 1) / uploadProgress.total) * 100}%`,
              }}
            />
          </div>
          {uploadProgress.currentFile && (
            <div className="truncate text-xs text-neutral-content">
              <TbFolder className="mr-1 inline" /> {uploadProgress.currentFile}
            </div>
          )}
          {uploadProgress.completedFiles.length > 0 && (
            <div className="mt-1 text-xs text-secondary-content">
              <TbCheck className="mr-1 inline" /> Completed:{" "}
              {uploadProgress.completedFiles.join(", ")}
            </div>
          )}
        </div>
      )}

      {filteredMedia.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
          {searchQuery ? (
            <div className="animate-modal-in flex flex-col items-center">
              <div className="mb-4 rounded-full bg-neutral p-6">
                <TbSearch className="text-5xl text-neutral-content" />
              </div>
              <p className="mb-2 text-xl font-semibold text-base-content">No media found</p>
              <p className="text-sm text-neutral-content">
                Try adjusting your search term or filter
              </p>
            </div>
          ) : (
            <EmptyState onSetAddMode={onSetAddMode} fileInputRef={fileInputRef} />
          )}
        </div>
      ) : (
        <div
          className={
            viewMode === "cards"
              ? "grid grid-cols-3 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5"
              : "flex flex-col"
          }
        >
          {filteredMedia.map(media => (
            <MediaItemRow
              key={media.id}
              media={media}
              viewMode={viewMode}
              sortField={sortField}
              isSelected={selectedMedia === media.id}
              isDeleting={deletingMedia.includes(media.id)}
              selectionMode={selectionMode}
              onSelect={() => onSetSelected(media.id)}
              onDoubleClick={() => {
                if (selectionMode && onSelect) {
                  onSelect(media.id);
                  onClose();
                }
              }}
              onPreview={() => onPreview(media.id)}
              onCrop={() => onCrop(media)}
              onReplace={() => onReplace(media.id)}
              onEdit={() => onEdit(media)}
              onDelete={() => onDelete(media.id)}
            />
          ))}
        </div>
      )}

      {/* Selection button */}
      {selectedMedia && selectionMode && onSelect && (
        <div className="absolute bottom-4 right-4">
          <button
            type="button"
            onClick={() => {
              onSelect(selectedMedia);
              onClose();
            }}
            className="btn btn-primary shadow-lg"
          >
            Select
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───

function EmptyState({
  onSetAddMode,
  fileInputRef,
}: {
  onSetAddMode: (mode: "upload" | "url" | "svg") => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="animate-slide-up flex max-w-2xl flex-col items-center">
      <h3 className="mb-2 text-2xl font-bold text-base-content">Your media library is empty</h3>
      <p className="mb-8 text-sm text-neutral-content">
        Start building your visual content collection
      </p>

      <div className="mb-8 grid w-full gap-3 sm:grid-cols-3">
        <button
          onClick={() => {
            onSetAddMode("upload");
            fileInputRef.current?.click();
          }}
          className="ph-media-grid-card"
        >
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <TbUpload className="text-xl text-primary" />
          </div>
          <h4 className="toolbar-label mb-1 font-semibold">Upload Files</h4>
          <p className="text-xs text-neutral-content">Drag & drop or click to upload images</p>
        </button>

        <button
          onClick={() => onSetAddMode("url")}
          className="ph-media-grid-card"
        >
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <TbExternalLink className="text-xl text-primary" />
          </div>
          <h4 className="toolbar-label mb-1 font-semibold">Use URLs</h4>
          <p className="text-xs text-neutral-content">Link to images hosted anywhere</p>
        </button>

        <button
          onClick={() => onSetAddMode("svg")}
          className="ph-media-grid-card"
        >
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <TbCode className="text-xl text-primary" />
          </div>
          <h4 className="toolbar-label mb-1 font-semibold">Paste SVG</h4>
          <p className="text-xs text-neutral-content">Add inline SVG code directly</p>
        </button>
      </div>

      <div className="flex flex-col gap-2 text-xs text-neutral-content">
        <div className="flex items-center gap-2">
          <TbInfoCircle className="text-base text-primary" />
          <span>Paste images from your clipboard anywhere in this window</span>
        </div>
        <div className="flex items-center gap-2">
          <TbInfoCircle className="text-base text-primary" />
          <span>Drag and drop multiple files at once for batch upload</span>
        </div>
      </div>
    </div>
  );
}

function MediaItemRow({
  media,
  viewMode,
  sortField,
  isSelected,
  isDeleting,
  selectionMode,
  onSelect,
  onDoubleClick,
  onPreview,
  onCrop,
  onReplace,
  onEdit,
  onDelete,
}: {
  media: MediaItem;
  viewMode: "cards" | "list";
  sortField: SortField;
  isSelected: boolean;
  isDeleting: boolean;
  selectionMode: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onPreview: () => void;
  onCrop: () => void;
  onReplace: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={`group relative cursor-pointer ${
        viewMode === "cards"
          ? `overflow-hidden rounded-lg border border-base-300 bg-base-200 hover:border-primary hover:shadow-md ${
              isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
            }`
          : `border-b border-base-300 hover:bg-neutral/50 ${isSelected ? "bg-primary/5" : ""}`
      } ${isDeleting ? "pointer-events-none opacity-60" : ""}`}
      onClick={onSelect}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      onDoubleClick={onDoubleClick}
    >
      {/* Deleting overlay */}
      {isDeleting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-error/20 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <TbLoader2 className="size-8 animate-spin text-error" />
            <span className="text-xs font-medium text-error">Deleting...</span>
          </div>
        </div>
      )}

      {viewMode === "cards" ? (
        <CardView media={media} sortField={sortField} />
      ) : (
        <ListView media={media} sortField={sortField} />
      )}

      {/* Action buttons */}
      <div
        className={`absolute ${viewMode === "cards" ? "right-1 top-1" : "right-3 top-1/2 -translate-y-1/2"} flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${isSelected ? "opacity-100" : "opacity-0"}`}
      >
        <ActionButton icon={<TbEye />} title="Preview image" onClick={onPreview} />
        <ActionButton icon={<TbCrop />} title="Crop/Resize image" onClick={onCrop} />
        <ActionButton icon={<TbRefresh />} title="Replace image" onClick={onReplace} />
        <ActionButton icon={<TbEdit />} title="Edit metadata" onClick={onEdit} />
        <ActionButton
          icon={<TbTrash />}
          title="Delete"
          onClick={onDelete}
          variant="destructive"
        />
      </div>

      {/* Metadata indicator */}
      {(media.metadata?.alt || media.metadata?.description) && (
        <div className="absolute bottom-10 left-1">
          <div className="size-2 rounded-full bg-secondary" />
        </div>
      )}
    </div>
  );
}

function ActionButton({
  icon,
  title,
  onClick,
  variant,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  variant?: "destructive";
}) {
  return (
    <button
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      className={`rounded-lg border border-base-300 bg-base-100 p-1.5 shadow-lg transition-colors hover:bg-neutral ${
        variant === "destructive"
          ? "text-error hover:bg-error hover:text-error-content"
          : "text-primary"
      }`}
      title={title}
    >
      <span className="text-sm">{icon}</span>
    </button>
  );
}

function CardView({ media, sortField }: { media: MediaItem; sortField: SortField }) {
  return (
    <div className="flex flex-col">
      <div
        key={`card-${media.id}`}
        className="relative aspect-square overflow-hidden bg-neutral bg-cover bg-center transition-transform duration-200 hover:scale-105"
        style={{
          backgroundImage:
            media.type === "url"
              ? `url("${media.metadata?.url}")`
              : media.type === "svg"
                ? undefined
                : `url(${getCdnUrl(media.cdnId || media.id, { width: 400, format: "auto" })})`,
        }}
      >
        {media.metadata?.size && (
          <div className="absolute bottom-1 right-1 rounded bg-base-100/90 px-1 py-0.5 text-[10px] text-base-content opacity-0 transition-opacity group-hover:opacity-100">
            {formatFileSize(media.metadata.size)}
          </div>
        )}
        {media.metadata?.dimensions && (
          <div className="absolute bottom-1 right-1 rounded bg-base-100/90 px-1 py-0.5 text-[10px] text-base-content opacity-100 transition-opacity group-hover:opacity-0">
            {formatDimensions(media.metadata.dimensions)}
          </div>
        )}
        {media.metadata?.isVariant && (
          <div className="absolute bottom-1 left-1 flex items-center justify-center rounded bg-primary px-1 py-0.5 text-[10px] text-primary-content">
            <TbCrop className="size-3" />
          </div>
        )}
        {media.type === "svg" && (
          <div
            className="flex size-full items-center justify-center p-2"
            dangerouslySetInnerHTML={{ __html: media.metadata?.svg || "" }}
          />
        )}
      </div>

      <div className="bg-accent p-1.5 text-accent-content">
        <p className="truncate text-xs font-medium text-base-content">
          {media.metadata?.title || media.id}
        </p>
        {sortField === "createdAt" && (
          <p className="truncate text-[10px] text-neutral-content">
            {media.metadata?.description ||
              (media.uploadedAt
                ? new Date(media.uploadedAt).toLocaleDateString()
                : "Unknown")}
          </p>
        )}
        {sortField === "order" && (
          <p className="text-[10px] text-neutral-content">Order: {media.order || 0}</p>
        )}
      </div>
    </div>
  );
}

function ListView({ media, sortField }: { media: MediaItem; sortField: SortField }) {
  return (
    <div className="flex items-center gap-4 px-3 py-2">
      {/* Thumbnail */}
      <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded border border-base-300 bg-neutral">
        {media.type === "url" ? (
          <div className="relative size-full bg-neutral">
            <Image
              key={`${media.id}-url-${media.uploadedAt || 0}`}
              src={media.metadata?.url!}
              alt={media.metadata?.alt || media.id}
              fill
              className="object-cover"
              onError={e => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
              placeholder="blur"
              blurDataURL={BLUR_PLACEHOLDER}
            />
          </div>
        ) : media.type === "svg" ? (
          <div
            className="size-full p-1"
            dangerouslySetInnerHTML={{ __html: media.metadata?.svg || "" }}
          />
        ) : (
          <div className="relative size-full bg-neutral">
            <Image
              key={`${media.id}-cdn-${media.uploadedAt || 0}`}
              src={getCdnUrl(media.cdnId || media.id, { width: 100, format: "auto" })}
              alt={media.metadata?.alt || media.id}
              fill
              className="object-cover"
              loading="lazy"
              onError={e => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
              placeholder="blur"
              blurDataURL={BLUR_PLACEHOLDER}
            />
          </div>
        )}
      </div>

      {/* Name */}
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-base-content">
          {media.metadata?.title || media.id}
        </p>
        {media.metadata?.isVariant && (
          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            Variant
          </span>
        )}
      </div>

      {/* Dimensions */}
      {media.metadata?.dimensions && (
        <div className="hidden shrink-0 text-xs text-neutral-content sm:block sm:w-24">
          {formatDimensions(media.metadata.dimensions)}
        </div>
      )}

      {/* Size */}
      {media.metadata?.size && (
        <div className="hidden shrink-0 text-xs text-neutral-content sm:block sm:w-20">
          {formatFileSize(media.metadata.size)}
        </div>
      )}

      {/* Date/Order */}
      <div className="hidden shrink-0 text-xs text-neutral-content md:block md:w-24">
        {sortField === "createdAt"
          ? media.uploadedAt
            ? new Date(media.uploadedAt).toLocaleDateString()
            : "Unknown"
          : sortField === "order"
            ? `Order: ${media.order || 0}`
            : ""}
      </div>
    </div>
  );
}
