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
import { EditorMenuNavRow, EditorMenuSectionLabel } from "@/chrome/viewport/EditorMenuNav";
import { getCdnUrl } from "@/utils/cdn";
import { formatDimensions } from "@/utils/imageDimensions";
import {
  formatFileSize,
  type MediaItem,
  type SortField,
  type UploadProgress,
} from "../utils/media-helpers";

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
      className={`scrollbar-light bg-base-100 relative flex-1 overflow-y-auto transition-colors ${
        isDragOver ? "border-accent bg-accent border-2 border-dashed" : ""
      } ${uploadProgress ? "pt-16" : "p-3"}`}
      {...dropProps}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="border-accent bg-base-200/75 absolute inset-0 z-40 flex items-center justify-center rounded-lg border-2 border-dashed backdrop-blur-sm">
          <div className="text-accent-content flex flex-col items-center gap-4">
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
        <div className="border-base-300 bg-base-200 absolute inset-x-0 top-0 z-30 border-b p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="border-accent size-4 animate-spin rounded-full border-2 border-t-transparent" />
              <span className="text-base-content text-sm font-medium">
                Uploading {uploadProgress.current + 1} of {uploadProgress.total} files
              </span>
            </div>
            <span className="text-neutral-content text-xs">
              {Math.round(((uploadProgress.current + 1) / uploadProgress.total) * 100)}%
            </span>
          </div>
          <div className="bg-neutral text-neutral-content mb-2 h-2 w-full rounded-full">
            <div
              className="bg-accent text-accent-content h-2 rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${((uploadProgress.current + 1) / uploadProgress.total) * 100}%`,
              }}
            />
          </div>
          {uploadProgress.currentFile && (
            <div className="text-neutral-content truncate text-xs">
              <TbFolder className="mr-1 inline" /> {uploadProgress.currentFile}
            </div>
          )}
          {uploadProgress.completedFiles.length > 0 && (
            <div className="text-secondary-content mt-1 text-xs">
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
              <div className="bg-neutral mb-4 rounded-full p-6">
                <TbSearch className="text-neutral-content text-5xl" />
              </div>
              <p className="text-base-content mb-2 text-xl font-semibold">No media found</p>
              <p className="text-neutral-content text-sm">
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
        <div className="absolute right-4 bottom-4">
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
    <div className="flex max-w-2xl animate-[slide-up_0.8s_ease-out_forwards] flex-col items-center">
      <h3 className="text-base-content mb-2 text-2xl font-bold">Your media library is empty</h3>
      <p className="text-neutral-content mb-8 text-sm">
        Start building your visual content collection
      </p>

      <div className="mb-8 w-full max-w-lg">
        <EditorMenuSectionLabel>Add media</EditorMenuSectionLabel>
        <div className="border-base-300 bg-base-100 overflow-hidden rounded-xl border">
          <EditorMenuNavRow
            icon={<TbUpload className="size-5" />}
            label={
              <div>
                <div className="text-base-content text-sm font-medium">Upload Files</div>
                <div className="text-neutral-content text-xs">
                  Drag & drop or click to upload images
                </div>
              </div>
            }
            onClick={() => {
              onSetAddMode("upload");
              fileInputRef.current?.click();
            }}
          />
          <div className="bg-base-300 h-px" aria-hidden />
          <EditorMenuNavRow
            icon={<TbExternalLink className="size-5" />}
            label={
              <div>
                <div className="text-base-content text-sm font-medium">Use URLs</div>
                <div className="text-neutral-content text-xs">Link to images hosted anywhere</div>
              </div>
            }
            onClick={() => onSetAddMode("url")}
          />
          <div className="bg-base-300 h-px" aria-hidden />
          <EditorMenuNavRow
            icon={<TbCode className="size-5" />}
            label={
              <div>
                <div className="text-base-content text-sm font-medium">Paste SVG</div>
                <div className="text-neutral-content text-xs">Add inline SVG code directly</div>
              </div>
            }
            onClick={() => onSetAddMode("svg")}
          />
        </div>
      </div>

      <div className="text-neutral-content flex flex-col gap-2 text-xs">
        <div className="flex items-center gap-2">
          <TbInfoCircle className="text-primary text-base" />
          <span>Paste images from your clipboard anywhere in this window</span>
        </div>
        <div className="flex items-center gap-2">
          <TbInfoCircle className="text-primary text-base" />
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
          ? `border-base-300 bg-base-200 hover:border-primary overflow-hidden rounded-lg border hover:shadow-md ${
              isSelected ? "ring-primary ring-offset-background ring-2 ring-offset-2" : ""
            }`
          : `border-base-300 hover:bg-neutral/50 border-b ${isSelected ? "bg-primary/5" : ""}`
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
        <div className="bg-error/20 absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <TbLoader2 className="text-error size-8 animate-spin" />
            <span className="text-error text-xs font-medium">Deleting...</span>
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
        className={`absolute ${viewMode === "cards" ? "top-1 right-1" : "top-1/2 right-3 -translate-y-1/2"} flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${isSelected ? "opacity-100" : "opacity-0"}`}
      >
        <ActionButton icon={<TbEye />} title="Preview image" onClick={onPreview} />
        <ActionButton icon={<TbCrop />} title="Crop/Resize image" onClick={onCrop} />
        <ActionButton icon={<TbRefresh />} title="Replace image" onClick={onReplace} />
        <ActionButton icon={<TbEdit />} title="Edit metadata" onClick={onEdit} />
        <ActionButton icon={<TbTrash />} title="Delete" onClick={onDelete} variant="destructive" />
      </div>

      {/* Metadata indicator */}
      {(media.metadata?.alt || media.metadata?.description) && (
        <div className="absolute bottom-10 left-1">
          <div className="bg-secondary size-2 rounded-full" />
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
      className={`border-base-300 bg-base-200 hover:bg-neutral rounded-lg border p-1.5 shadow-lg transition-colors ${
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
        className="bg-neutral relative aspect-square overflow-hidden bg-cover bg-center transition-transform duration-200 hover:scale-105"
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
          <div className="bg-base-100/90 text-base-content absolute right-1 bottom-1 rounded px-1 py-0.5 text-[10px] opacity-0 transition-opacity group-hover:opacity-100">
            {formatFileSize(media.metadata.size)}
          </div>
        )}
        {media.metadata?.dimensions && (
          <div className="bg-base-100/90 text-base-content absolute right-1 bottom-1 rounded px-1 py-0.5 text-[10px] opacity-100 transition-opacity group-hover:opacity-0">
            {formatDimensions(media.metadata.dimensions)}
          </div>
        )}
        {media.metadata?.isVariant && (
          <div className="bg-primary text-primary-content absolute bottom-1 left-1 flex items-center justify-center rounded px-1 py-0.5 text-[10px]">
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

      <div className="bg-accent text-accent-content p-1.5">
        <p className="text-base-content truncate text-xs font-medium">
          {media.metadata?.title || media.id}
        </p>
        {sortField === "createdAt" && (
          <p className="text-neutral-content truncate text-[10px]">
            {media.metadata?.description ||
              (media.uploadedAt ? new Date(media.uploadedAt).toLocaleDateString() : "Unknown")}
          </p>
        )}
        {sortField === "order" && (
          <p className="text-neutral-content text-[10px]">Order: {media.order || 0}</p>
        )}
      </div>
    </div>
  );
}

function ListView({ media, sortField }: { media: MediaItem; sortField: SortField }) {
  return (
    <div className="flex items-center gap-4 px-3 py-2">
      {/* Thumbnail */}
      <div className="border-base-300 bg-neutral flex size-12 shrink-0 items-center justify-center overflow-hidden rounded border">
        {media.type === "url" ? (
          <div className="bg-neutral relative size-full">
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
          <div className="bg-neutral relative size-full">
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
        <p className="text-base-content min-w-0 flex-1 truncate text-sm font-medium">
          {media.metadata?.title || media.id}
        </p>
        {media.metadata?.isVariant && (
          <span className="bg-primary/10 text-primary shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium">
            Variant
          </span>
        )}
      </div>

      {/* Dimensions */}
      {media.metadata?.dimensions && (
        <div className="text-neutral-content hidden shrink-0 text-xs sm:block sm:w-24">
          {formatDimensions(media.metadata.dimensions)}
        </div>
      )}

      {/* Size */}
      {media.metadata?.size && (
        <div className="text-neutral-content hidden shrink-0 text-xs sm:block sm:w-20">
          {formatFileSize(media.metadata.size)}
        </div>
      )}

      {/* Date/Order */}
      <div className="text-neutral-content hidden shrink-0 text-xs md:block md:w-24">
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
