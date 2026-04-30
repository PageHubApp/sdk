import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { AssistantOpenAtom, useSetAtomState } from "@/utils/atoms";
import { useEffect, useRef, useState } from "react";
import {
  TbArrowDown,
  TbArrowUp,
  TbCalendar,
  TbCheckbox,
  TbClipboard,
  TbEdit,
  TbEye,
  TbFilter,
  TbFolder,
  TbFolderPlus,
  TbInfoCircle,
  TbPlus,
  TbRefresh,
  TbScissors,
  TbTrash,
  TbSearch,
  TbUpload,
  TbLayoutGrid,
  TbList,
  TbX,
} from "react-icons/tb";
import { getUploadAccept } from "@/utils/media/upload";
import { ToolbarDropdown } from "../../../ToolbarDropdown";
import {
  getMediaKind,
  getReplaceAccept,
  MEDIA_KIND_LABELS,
  type MediaKind,
  type SortField,
} from "../utils/media-helpers";
import type { UseMediaManagerReturn } from "../hooks/useMediaManager";

interface MediaToolbarProps {
  manager: UseMediaManagerReturn;
  selectionMode: boolean;
  filteredCount: number;
  totalCount: number;
  selectedCount: number;
  busy: boolean;
  canRenameOrDeleteFolder: boolean;
  onSelectVisible: () => void;
  onCreateFolder: () => void;
  onRenameFolder: () => void;
  onDeleteFolder: () => void;
  folders: Array<{ id: string; name: string }>;
  singleSelectedId: string | null;
  onMoveSelectedToFolder: (folderId: string | null) => void;
  onPreviewSingleSelected: () => void;
  onEditSingleSelected: () => void;
  onCropSingleSelected: () => void;
  onReplaceSingleSelected: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
}

export function MediaToolbar({
  manager,
  selectionMode,
  filteredCount,
  totalCount,
  selectedCount,
  busy,
  canRenameOrDeleteFolder,
  onSelectVisible,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  folders,
  singleSelectedId,
  onMoveSelectedToFolder,
  onPreviewSingleSelected,
  onEditSingleSelected,
  onCropSingleSelected,
  onReplaceSingleSelected,
  onDeleteSelected,
  onClearSelection,
}: MediaToolbarProps) {
  const setAssistantOpen = useSetAtomState(AssistantOpenAtom);
  const {
    searchQuery,
    viewMode,
    sortField,
    sortDirection,
    kindFilter,
    addMode,
    urlInput,
    svgInput,
    saveUrlToCdn,
    hasImageInClipboard,
    uploading,
    canUseImageGenerate,
    toolbarRef,
    fileInputRef,
    replaceInputRef,
    mediaList,
    replacingMedia,
    // Setters
    setViewMode,
    setSortField,
    setSortDirection,
    setKindFilter,
    setAddMode,
    setUrlInput,
    setSvgInput,
    setSaveUrlToCdn,
    // Handlers
    handleSearch,
    handleUpload,
    handleAddUrl,
    handleAddSvg,
    handlePasteClick,
    handleReplaceMedia,
    resortFilteredMedia,
    onClose,
  } = manager;

  const replaceTarget = replacingMedia ? mediaList.find(m => m.id === replacingMedia) : null;
  const replaceAccept = replaceTarget ? getReplaceAccept(replaceTarget) : getUploadAccept();
  const [showCompactSearch, setShowCompactSearch] = useState(false);
  const compactSearchInputRef = useRef<HTMLInputElement | null>(null);
  const kindCounts = mediaList.reduce(
    (acc, item) => {
      const kind = getMediaKind(item);
      acc[kind] = (acc[kind] || 0) + 1;
      return acc;
    },
    {} as Record<MediaKind, number>
  );

  /** One height for search + segmented controls; use tool-bg-flat (not tool-bg) so clusters match the bar — no shadow-xl */
  const barH = "h-8";
  const toolClusterClass = `tool-bg-flat ${barH} shrink-0 !items-stretch !justify-start !gap-0.5 !px-0 !py-0 text-neutral-content [&_button.tool-button]:h-full [&_button.tool-button]:min-h-0 [&_button.tool-button]:rounded-sm [&_button.tool-button]:px-1.5`;
  const toggleSortDirection = () => {
    const nextDirection = sortDirection === "asc" ? "desc" : "asc";
    setSortDirection(nextDirection);
    resortFilteredMedia({ sortDirection: nextDirection });
  };

  useEffect(() => {
    if (!showCompactSearch) return;
    compactSearchInputRef.current?.focus();
  }, [showCompactSearch]);

  useEffect(() => {
    if (!showCompactSearch) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (toolbarRef.current?.contains(target)) return;
      setShowCompactSearch(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowCompactSearch(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showCompactSearch, toolbarRef]);

  return (
    <div ref={toolbarRef} className="border-base-300 bg-neutral border-b px-3 py-1">
      <div>
        <div className="flex w-full min-w-0 items-center gap-1">
          <div className={`${toolClusterClass} order-1`}>
            <button
              type="button"
              onClick={() => setShowCompactSearch(prev => !prev)}
              className={`tool-button flex h-full items-stretch px-2 ${
                showCompactSearch || !!searchQuery ? "bg-base-200 text-base-content" : ""
              }`}
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Search media"
              data-tooltip-place="bottom"
              data-tooltip-offset={10}
            >
              <TbSearch className="size-4" />
            </button>
          </div>

          {/* View Mode */}
          <div className={`${toolClusterClass} order-2`}>
            <button
              onClick={() => setViewMode("cards")}
              type="button"
              className={`tool-button flex h-full items-stretch px-2 ${viewMode === "cards" ? "bg-base-200 text-base-content" : ""}`}
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Card view"
              data-tooltip-place="bottom"
              data-tooltip-offset={10}
            >
              <TbLayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              type="button"
              className={`tool-button flex h-full items-stretch px-2 ${viewMode === "list" ? "bg-base-200 text-base-content" : ""}`}
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="List view"
              data-tooltip-place="bottom"
              data-tooltip-offset={10}
            >
              <TbList className="size-4" />
            </button>
          </div>

          {/* Sort — ToolbarDropdown (Listbox + ph-select-content), not native <select> */}
          <div className={`${toolClusterClass} order-2 min-w-0`}>
            <div className="hidden h-full min-h-0 items-stretch md:flex">
              <ToolbarDropdown
                wrap="control"
                propKey="media-sort-field"
                tooltipId={PAGEHUB_RTT_GLOBAL_ID}
                tooltipContent="Sort by"
                placeholder={<TbCalendar className="size-4" />}
                value=""
                onChange={(val: string) => {
                  setSortField(val as SortField);
                  resortFilteredMedia({ sortField: val as SortField });
                }}
                append={
                  <button
                    type="button"
                    onClick={toggleSortDirection}
                    className="tool-button flex h-full items-stretch px-1.5"
                    data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                    data-tooltip-content={`${sortField} • ${sortDirection === "asc" ? "ascending" : "descending"}`}
                    data-tooltip-place="bottom"
                    data-tooltip-offset={10}
                  >
                    {sortDirection === "asc" ? (
                      <TbArrowUp className="size-3.5" />
                    ) : (
                      <TbArrowDown className="size-3.5" />
                    )}
                  </button>
                }
              >
                <option value="createdAt">Date</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="order">Order</option>
              </ToolbarDropdown>
            </div>
            <div className="flex h-full min-h-0 items-stretch md:hidden">
              <ToolbarDropdown
                wrap="control"
                propKey="media-sort-field-compact"
                tooltipId={PAGEHUB_RTT_GLOBAL_ID}
                tooltipContent="Sort by"
                placeholder={<TbCalendar className="size-4" />}
                value=""
                onChange={(val: string) => {
                  setSortField(val as SortField);
                  resortFilteredMedia({ sortField: val as SortField });
                }}
              >
                <option value="createdAt">Date</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="order">Order</option>
              </ToolbarDropdown>
              <button
                type="button"
                onClick={toggleSortDirection}
                className="tool-button flex h-full items-stretch px-1.5"
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content={`Sort ${sortDirection === "asc" ? "ascending" : "descending"}`}
                data-tooltip-place="bottom"
                data-tooltip-offset={10}
              >
                {sortDirection === "asc" ? (
                  <TbArrowUp className="size-3.5" />
                ) : (
                  <TbArrowDown className="size-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* File Type Filter */}
          <div className={`${toolClusterClass} order-2 min-w-0`}>
            <div className="hidden h-full min-h-0 items-stretch md:flex">
              <ToolbarDropdown
                wrap="control"
                propKey="media-kind-filter"
                tooltipId={PAGEHUB_RTT_GLOBAL_ID}
                tooltipContent="Filter by media type"
                placeholder={<TbFilter className="size-4" />}
                value=""
                onChange={(val: string) => setKindFilter(val as MediaKind | "all")}
              >
                <option value="all">All types ({mediaList.length})</option>
                <option value="image">Image ({kindCounts.image || 0})</option>
                <option value="video">Video ({kindCounts.video || 0})</option>
                <option value="audio">Audio ({kindCounts.audio || 0})</option>
                <option value="pdf">PDF ({kindCounts.pdf || 0})</option>
                <option value="archive">Archive ({kindCounts.archive || 0})</option>
                <option value="other">
                  {MEDIA_KIND_LABELS.other} ({kindCounts.other || 0})
                </option>
              </ToolbarDropdown>
            </div>
            <div className="flex h-full min-h-0 items-stretch md:hidden">
              <ToolbarDropdown
                wrap="control"
                propKey="media-kind-filter-compact"
                tooltipId={PAGEHUB_RTT_GLOBAL_ID}
                tooltipContent="Filter by media type"
                placeholder={<TbFilter className="size-4" />}
                value=""
                onChange={(val: string) => setKindFilter(val as MediaKind | "all")}
              >
                <option value="all">All types ({mediaList.length})</option>
                <option value="image">Image ({kindCounts.image || 0})</option>
                <option value="video">Video ({kindCounts.video || 0})</option>
                <option value="audio">Audio ({kindCounts.audio || 0})</option>
                <option value="pdf">PDF ({kindCounts.pdf || 0})</option>
                <option value="archive">Archive ({kindCounts.archive || 0})</option>
                <option value="other">
                  {MEDIA_KIND_LABELS.other} ({kindCounts.other || 0})
                </option>
              </ToolbarDropdown>
            </div>
          </div>

          {/* Add Mode */}
          <div className={`${toolClusterClass} order-2`}>
            <button
              type="button"
              onClick={() => {
                setAddMode("upload");
                fileInputRef.current?.click();
              }}
              disabled={uploading}
              className={`tool-button flex h-full items-stretch px-2 ${addMode === "upload" ? "bg-base-200 text-base-content" : ""}`}
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Upload files"
              data-tooltip-place="bottom"
              data-tooltip-offset={10}
            >
              <TbUpload className="size-4" />
            </button>
            <div className="flex h-full min-h-0 w-[2.5rem] items-stretch md:w-full md:max-w-[8.5rem] [&_button.input-plain]:text-xs">
              <ToolbarDropdown
                wrap="control"
                propKey="media-add-actions"
                tooltipId={PAGEHUB_RTT_GLOBAL_ID}
                tooltipContent="Add media actions"
                placeholder={<TbPlus className="size-4" />}
                value=""
                onChange={(val: string) => {
                  if (val === "url") setAddMode("url");
                  if (val === "svg") setAddMode("svg");
                  if (val === "ai" && canUseImageGenerate) {
                    onClose();
                    setAssistantOpen({
                      revealPanel: true,
                      freshChat: true,
                      assistantScope: "media",
                      mediaContext: { intent: "generate-image" },
                      promptHint: "Generate a new image for my media library.",
                    });
                  }
                  if (val === "paste") handlePasteClick();
                }}
              >
                <option value="url">Add from URL</option>
                <option value="svg">Paste SVG</option>
                {canUseImageGenerate && <option value="ai">Generate with AI</option>}
                <option value="paste">Paste from clipboard</option>
              </ToolbarDropdown>
            </div>
            <button
              type="button"
              onClick={handlePasteClick}
              disabled={!hasImageInClipboard || uploading}
              className="tool-button flex h-full items-stretch px-2"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content={
                hasImageInClipboard
                  ? "Paste image from clipboard (Ctrl+V / Cmd+V)"
                  : "No image in clipboard"
              }
              data-tooltip-place="bottom"
              data-tooltip-offset={10}
            >
              <TbClipboard className="size-4" />
            </button>
          </div>

          {!selectionMode && (
            <div className={`${toolClusterClass} order-2`}>
              {filteredCount > 0 && (
                <button
                  type="button"
                  onClick={onSelectVisible}
                  disabled={busy}
                  className="tool-button flex h-full items-stretch px-2"
                  data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                  data-tooltip-content="Select all items in current view"
                  data-tooltip-place="bottom"
                  data-tooltip-offset={10}
                >
                  <TbCheckbox className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onCreateFolder}
                disabled={busy}
                className="tool-button flex h-full items-stretch px-2"
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content="Create folder"
                data-tooltip-place="bottom"
                data-tooltip-offset={10}
              >
                <TbFolderPlus className="size-4" />
              </button>
              <button
                type="button"
                onClick={onRenameFolder}
                disabled={!canRenameOrDeleteFolder || busy}
                className="tool-button flex h-full items-stretch px-2"
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content="Rename selected folder tab"
                data-tooltip-place="bottom"
                data-tooltip-offset={10}
              >
                <TbEdit className="size-4" />
              </button>
              <button
                type="button"
                onClick={onDeleteFolder}
                disabled={!canRenameOrDeleteFolder || busy}
                className="tool-button text-error flex h-full items-stretch px-2"
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content="Delete selected folder tab"
                data-tooltip-place="bottom"
                data-tooltip-offset={10}
              >
                <TbTrash className="size-4" />
              </button>
            </div>
          )}

          {!selectionMode && selectedCount > 0 && (
            <div className={`${toolClusterClass} order-2`}>
              <ToolbarDropdown
                wrap="control"
                propKey="media-move-selected"
                tooltipId={PAGEHUB_RTT_GLOBAL_ID}
                tooltipContent="Move selected items"
                placeholder={<TbFolder className="size-4" />}
                value=""
                onChange={(val: string) => onMoveSelectedToFolder(val === "unfiled" ? null : val)}
              >
                <option value="unfiled">Move to Unfiled</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    Move to {folder.name}
                  </option>
                ))}
              </ToolbarDropdown>

              {singleSelectedId && (
                <>
                  <button
                    type="button"
                    onClick={onPreviewSingleSelected}
                    disabled={busy}
                    className="tool-button flex h-full items-stretch px-2"
                    data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                    data-tooltip-content="Preview selected"
                    data-tooltip-place="bottom"
                    data-tooltip-offset={10}
                  >
                    <TbEye className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onEditSingleSelected}
                    disabled={busy}
                    className="tool-button flex h-full items-stretch px-2"
                    data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                    data-tooltip-content="Edit selected"
                    data-tooltip-place="bottom"
                    data-tooltip-offset={10}
                  >
                    <TbEdit className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onCropSingleSelected}
                    disabled={busy}
                    className="tool-button flex h-full items-stretch px-2"
                    data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                    data-tooltip-content="Crop selected"
                    data-tooltip-place="bottom"
                    data-tooltip-offset={10}
                  >
                    <TbScissors className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onReplaceSingleSelected}
                    disabled={busy}
                    className="tool-button flex h-full items-stretch px-2"
                    data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                    data-tooltip-content="Replace selected"
                    data-tooltip-place="bottom"
                    data-tooltip-offset={10}
                  >
                    <TbRefresh className="size-4" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={onDeleteSelected}
                disabled={busy}
                className="tool-button text-error flex h-full items-stretch px-2"
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content="Delete selected"
                data-tooltip-place="bottom"
                data-tooltip-offset={10}
              >
                <TbTrash className="size-4" />
              </button>
              <button
                type="button"
                onClick={onClearSelection}
                disabled={busy}
                className="tool-button flex h-full items-stretch px-2"
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content="Clear selection"
                data-tooltip-place="bottom"
                data-tooltip-offset={10}
              >
                <TbX className="size-4" />
              </button>
            </div>
          )}

          <div className="text-neutral-content order-3 ml-auto shrink-0 text-[11px]">
            {selectionMode
              ? `${filteredCount} ${filteredCount === 1 ? "item" : "items"}`
              : selectedCount > 0
                ? `${selectedCount} selected`
                : searchQuery
                  ? `${filteredCount} of ${totalCount}`
                  : `${filteredCount} ${filteredCount === 1 ? "item" : "items"}`}
          </div>
        </div>
      </div>

      {showCompactSearch && (
        <div className="mt-2">
          <div
            className={`input-wrapper input-hover relative flex min-h-0 w-full items-center ${barH}`}
          >
            <TbSearch className="text-neutral-content pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2" />
            <input
              ref={compactSearchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search media..."
              className="input-plain-search h-full! min-h-0 pl-10"
            />
          </div>
        </div>
      )}

      {/* URL input */}
      {addMode === "url" && (
        <div className="mt-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="input-dialog placeholder:text-neutral-content flex-1"
              onKeyDown={e => e.key === "Enter" && handleAddUrl()}
              autoFocus
            />
            <button
              type="button"
              onClick={handleAddUrl}
              disabled={!urlInput.trim() || uploading}
              className="btn btn-primary text-sm!"
            >
              Add
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="saveUrlToCdn"
              checked={saveUrlToCdn}
              onChange={e => setSaveUrlToCdn(e.target.checked)}
              className="border-base-300 bg-neutral text-accent focus:ring-ring size-4 rounded-lg"
            />
            <label htmlFor="saveUrlToCdn" className="text-neutral-content text-xs">
              Save to CDN (downloads image to your account)
            </label>
          </div>
          <div className="text-neutral-content mt-2 text-xs">
            <TbInfoCircle className="mr-1 inline" /> Tip: You can also paste images directly (Ctrl+V
            / Cmd+V) or use the clipboard button above!
          </div>
        </div>
      )}

      {/* SVG input */}
      {addMode === "svg" && (
        <div className="mt-2">
          <div className="flex gap-2">
            <textarea
              value={svgInput}
              onChange={e => setSvgInput(e.target.value)}
              placeholder="<svg>...</svg>"
              className="input-dialog placeholder:text-neutral-content min-h-[4.5rem] flex-1 resize-none font-mono text-xs"
              rows={3}
              autoFocus
            />
            <button
              type="button"
              onClick={handleAddSvg}
              disabled={!svgInput.trim()}
              className="btn btn-primary text-sm!"
            >
              Add
            </button>
          </div>
          <p className="text-neutral-content mt-1.5 ml-0.5 text-xs">
            Find SVGs @{" "}
            <a
              href="https://www.svgrepo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary underline"
            >
              svgrepo.com
            </a>
          </p>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={getUploadAccept()}
        multiple
        onChange={e => handleUpload(e.target.files)}
        className="hidden"
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept={replaceAccept}
        onChange={e => handleReplaceMedia(e.target.files)}
        className="hidden"
      />
    </div>
  );
}
