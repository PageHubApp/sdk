import Image from "next/image";
import {
  TbCheck,
  TbCode,
  TbExternalLink,
  TbFile,
  TbFileMusic,
  TbFolder,
  TbInfoCircle,
  TbLoader2,
  TbSearch,
  TbEye,
  TbUpload,
} from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { EditorMenuNavRow, EditorMenuSectionLabel } from "@/chrome/viewport/EditorMenuNav";
import { getCdnUrl } from "@/utils/cdn";
import { formatDimensions } from "@/utils/imageDimensions";
import {
  formatFileSize,
  getMediaKind,
  MEDIA_KIND_LABELS,
  type MediaItem,
  type SortField,
  type UploadProgress,
} from "../utils/media-helpers";

const BLUR_PLACEHOLDER =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

interface MediaGridProps {
  filteredMedia: MediaItem[];
  viewMode: "cards" | "list";
  sortField: SortField;
  selectedMedia: string | null;
  selectedMediaIds: string[];
  deletingMedia: string[];
  searchQuery: string;
  uploadProgress: UploadProgress | null;
  isDragOver: boolean;
  dropProps: Record<string, unknown>;
  selectionMode: boolean;
  onSelect: ((mediaId: string) => void) | undefined;
  onClose: () => void;
  onItemSelect: (
    id: string,
    modifiers?: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }
  ) => void;
  onPreview: (id: string) => void;
  onSetAddMode: (mode: "upload" | "url" | "svg" | "ai") => void;
  folderNameById: Map<string, string>;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export function MediaGrid({
  filteredMedia,
  viewMode,
  sortField,
  selectedMedia,
  selectedMediaIds,
  deletingMedia,
  searchQuery,
  uploadProgress,
  isDragOver,
  dropProps,
  selectionMode,
  onSelect,
  onClose,
  onItemSelect,
  onPreview,
  onSetAddMode,
  folderNameById,
  fileInputRef,
}: MediaGridProps) {
  return (
    <div
      className={`scrollbar-light bg-base-100 relative h-full overflow-y-auto transition-colors ${
        isDragOver ? "border-accent bg-accent border-2 border-dashed" : ""
      } ${uploadProgress ? "pt-16" : "p-3"}`}
      {...dropProps}
    >
      {isDragOver && (
        <div className="border-accent bg-base-200/75 absolute inset-0 z-40 flex items-center justify-center rounded-lg border-2 border-dashed backdrop-blur-sm">
          <div className="text-accent-content flex flex-col items-center gap-4">
            <TbUpload className="text-6xl" />
            <div className="text-center">
              <p className="text-xl font-semibold">Drop files here</p>
              <p className="text-sm opacity-75">Release to upload multiple files</p>
            </div>
          </div>
        </div>
      )}

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
              <TbCheck className="mr-1 inline" /> Completed: {uploadProgress.completedFiles.join(", ")}
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
              <p className="text-neutral-content text-sm">Try adjusting search or folder/type filters</p>
            </div>
          ) : (
            <EmptyState onSetAddMode={onSetAddMode} fileInputRef={fileInputRef} />
          )}
        </div>
      ) : (
        <>
          {viewMode === "list" && (
            <div className="text-neutral-content mb-2 grid grid-cols-[2rem_minmax(0,1fr)_6rem_7rem_7rem_8rem] items-center gap-3 px-3 text-[11px] font-semibold uppercase tracking-wide">
              <span />
              <span>Name</span>
              <span>Type</span>
              <span>Size</span>
              <span>Modified</span>
              <span>Folder</span>
            </div>
          )}
          <div
            className={
              viewMode === "cards"
                ? "grid grid-cols-[repeat(auto-fill,minmax(11.5rem,1fr))] gap-3"
                : "flex flex-col"
            }
          >
            {filteredMedia.map(media => {
              const isSelected = selectedMediaIds.includes(media.id);
              return (
                <MediaItemRow
                  key={media.id}
                  media={media}
                  viewMode={viewMode}
                  sortField={sortField}
                  isSelected={isSelected}
                  isDeleting={deletingMedia.includes(media.id)}
                  folderNameById={folderNameById}
                  selectionMode={selectionMode}
                  onSelect={modifiers => onItemSelect(media.id, modifiers)}
                  onDoubleClick={() => {
                    if (selectionMode && onSelect) {
                      onSelect(media.id);
                      onClose();
                    }
                  }}
                  onPreview={() => onPreview(media.id)}
                />
              );
            })}
          </div>
        </>
      )}

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

function EmptyState({
  onSetAddMode,
  fileInputRef,
}: {
  onSetAddMode: (mode: "upload" | "url" | "svg") => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="flex w-full max-w-2xl animate-[slide-up_0.8s_ease-out_forwards] flex-col items-center justify-center gap-8">
      <div className="w-full max-w-lg">
        <EditorMenuSectionLabel>Add media</EditorMenuSectionLabel>
        <div className="border-base-300 bg-base-100 overflow-hidden rounded-xl border">
          <EditorMenuNavRow
            icon={<TbUpload className="size-5" />}
            label={
              <div>
                <div className="text-base-content text-sm font-medium">Upload Files</div>
                <div className="text-neutral-content text-xs">Drag & drop or click to upload files</div>
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
                <div className="text-neutral-content text-xs">Link to assets hosted anywhere</div>
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
  folderNameById,
  selectionMode,
  onSelect,
  onDoubleClick,
  onPreview,
}: {
  media: MediaItem;
  viewMode: "cards" | "list";
  sortField: SortField;
  isSelected: boolean;
  isDeleting: boolean;
  folderNameById: Map<string, string>;
  selectionMode: boolean;
  onSelect: (modifiers?: { shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean }) => void;
  onDoubleClick: () => void;
  onPreview: () => void;
}) {
  const kind = getMediaKind(media);
  const folderLabel = media.metadata?.folderId
    ? (folderNameById.get(media.metadata.folderId) ?? "Unfiled")
    : "Unfiled";

  const handleClick = (e: React.MouseEvent) => {
    onSelect({ shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`group relative cursor-pointer ${
        viewMode === "cards"
          ? `border-base-300 bg-base-200 overflow-hidden rounded-lg border ${
              isSelected ? "ring-primary ring-offset-background ring-2 ring-offset-2" : "hover:border-primary"
            }`
          : `border-base-300 grid grid-cols-[2rem_minmax(0,1fr)_6rem_7rem_7rem_8rem] items-center gap-3 border-b px-3 py-1.5 ${
              isSelected ? "bg-primary/8" : "hover:bg-neutral/40"
            }`
      } ${isDeleting ? "pointer-events-none opacity-60" : ""}`}
      onClick={handleClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {isDeleting && (
        <div className="bg-error/20 absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <TbLoader2 className="text-error size-8 animate-spin" />
            <span className="text-error text-xs font-medium">Deleting...</span>
          </div>
        </div>
      )}

      {viewMode === "cards" ? (
        <CardView media={media} sortField={sortField} folderLabel={folderLabel} kind={kind} />
      ) : (
        <ListView media={media} folderLabel={folderLabel} kind={kind} showLeadingSpacer={selectionMode} />
      )}

      {!selectionMode && (
        <div
          className={`${viewMode === "cards" ? "absolute top-1 left-1" : "contents"}`}
          onClick={e => e.stopPropagation()}
        >
          {viewMode === "cards" ? (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              onClick={e => {
                e.stopPropagation();
                onSelect({ shiftKey: e.shiftKey, metaKey: true });
              }}
              className="checkbox checkbox-sm border-base-300 bg-base-100/95"
              aria-label="Select media item"
            />
          ) : (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              onClick={e => {
                e.stopPropagation();
                onSelect({ shiftKey: e.shiftKey, metaKey: true });
              }}
              className="checkbox checkbox-sm border-base-300 bg-base-100/95"
              aria-label="Select media item"
            />
          )}
        </div>
      )}

      {viewMode === "cards" && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onPreview();
          }}
          className="bg-base-100/90 text-base-content absolute top-1 right-1 rounded p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Preview media"
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Preview"
          data-tooltip-place="top"
          data-tooltip-offset={8}
        >
          <TbEye className="size-4" />
        </button>
      )}
    </div>
  );
}

function CardView({
  media,
  sortField,
  folderLabel,
  kind,
}: {
  media: MediaItem;
  sortField: SortField;
  folderLabel: string;
  kind: ReturnType<typeof getMediaKind>;
}) {
  const isR2 = media.type === "r2";
  const contentType = media.metadata?.contentType || "";
  const isVideo = isR2 && contentType.startsWith("video/");
  const isAudio = isR2 && contentType.startsWith("audio/");
  const deliveryURL = media.metadata?.deliveryURL;

  return (
    <div className="flex h-full flex-col">
      <div
        className="bg-neutral relative aspect-square overflow-hidden bg-cover bg-center"
        style={{
          backgroundImage:
            media.type === "url"
              ? `url("${media.metadata?.url}")`
              : media.type === "svg" || isR2
                ? undefined
                : `url(${getCdnUrl(media.cdnId || media.id, { width: 400, format: "auto" })})`,
        }}
      >
        <div className="bg-base-100/95 text-base-content absolute top-1 right-1 rounded px-1.5 py-0.5 text-[10px] font-medium">
          {MEDIA_KIND_LABELS[kind]}
        </div>

        {media.type === "svg" && (
          <div
            className="flex size-full items-center justify-center p-2"
            dangerouslySetInnerHTML={{ __html: media.metadata?.svg || "" }}
          />
        )}

        {isVideo && deliveryURL && (
          <video
            src={deliveryURL}
            className="size-full object-cover"
            preload="metadata"
            muted
            playsInline
          />
        )}

        {isR2 && !isVideo && (
          <div className="text-base-content/70 flex size-full flex-col items-center justify-center gap-1 p-2">
            {isAudio ? <TbFileMusic className="size-8" /> : <TbFile className="size-8" />}
            <span className="truncate text-[10px]">{contentType || "file"}</span>
          </div>
        )}
      </div>

      <div className="bg-base-100 flex min-h-[4.5rem] flex-col gap-0.5 p-2">
        <p className="text-base-content truncate text-xs font-semibold">{media.metadata?.title || media.id}</p>
        <p className="text-neutral-content truncate text-[10px]">
          {media.metadata?.size ? formatFileSize(media.metadata.size) : "--"}
          {media.metadata?.dimensions ? ` • ${formatDimensions(media.metadata.dimensions)}` : ""}
        </p>
        <p className="text-neutral-content truncate text-[10px]">
          {sortField === "createdAt"
            ? media.uploadedAt
              ? new Date(media.uploadedAt).toLocaleDateString()
              : "Unknown date"
            : folderLabel}
          {sortField !== "createdAt" ? "" : ` • ${folderLabel}`}
        </p>
      </div>
    </div>
  );
}

function ListView({
  media,
  folderLabel,
  kind,
  showLeadingSpacer,
}: {
  media: MediaItem;
  folderLabel: string;
  kind: ReturnType<typeof getMediaKind>;
  showLeadingSpacer: boolean;
}) {
  const isR2 = media.type === "r2";
  const contentType = media.metadata?.contentType || "";
  const isVideo = isR2 && contentType.startsWith("video/");
  const isAudio = isR2 && contentType.startsWith("audio/");
  const deliveryURL = media.metadata?.deliveryURL;

  return (
    <>
      {showLeadingSpacer ? <span /> : null}
      <div className="flex min-w-0 items-center gap-3">
        <div className="border-base-300 bg-neutral flex size-10 shrink-0 items-center justify-center overflow-hidden rounded border">
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
            <div className="size-full p-1" dangerouslySetInnerHTML={{ __html: media.metadata?.svg || "" }} />
          ) : isVideo && deliveryURL ? (
            <video
              src={deliveryURL}
              className="size-full object-cover"
              preload="metadata"
              muted
              playsInline
            />
          ) : isR2 ? (
            <div className="text-base-content/70 flex size-full items-center justify-center">
              {isAudio ? <TbFileMusic className="size-5" /> : <TbFile className="size-5" />}
            </div>
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

        <div className="min-w-0">
          <p className="text-base-content truncate text-sm font-medium">{media.metadata?.title || media.id}</p>
          <p className="text-neutral-content truncate text-[11px]">{media.id}</p>
        </div>
      </div>

      <div className="text-neutral-content truncate text-xs">{MEDIA_KIND_LABELS[kind]}</div>
      <div className="text-neutral-content truncate text-xs">
        {media.metadata?.size ? formatFileSize(media.metadata.size) : "--"}
      </div>
      <div className="text-neutral-content truncate text-xs">
        {media.uploadedAt ? new Date(media.uploadedAt).toLocaleDateString() : "--"}
      </div>
      <div className="text-neutral-content truncate text-xs">{folderLabel}</div>
    </>
  );
}
