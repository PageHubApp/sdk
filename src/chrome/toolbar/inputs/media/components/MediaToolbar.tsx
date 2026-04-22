import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import {
  TbArrowDown,
  TbArrowUp,
  TbClipboard,
  TbCode,
  TbExternalLink,
  TbInfoCircle,
  TbSearch,
  TbWand,
  TbUpload,
  TbLayoutGrid,
  TbList,
} from "react-icons/tb";
import { getUploadAccept } from "@/utils/media/upload";
import { ToolbarDropdown } from "../../../ToolbarDropdown";
import { getReplaceAccept, type AddMode, type SortField } from "../utils/media-helpers";
import type { UseMediaManagerReturn } from "../hooks/useMediaManager";

interface MediaToolbarProps {
  manager: UseMediaManagerReturn;
}

export function MediaToolbar({ manager }: MediaToolbarProps) {
  const {
    searchQuery,
    viewMode,
    sortField,
    sortDirection,
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
    renderMediaManagerAiPanel,
    mediaManagerAiPanelContext,
  } = manager;

  const replaceTarget = replacingMedia ? mediaList.find(m => m.id === replacingMedia) : null;
  const replaceAccept = replaceTarget ? getReplaceAccept(replaceTarget) : getUploadAccept();

  /** One height for search + segmented controls; use tool-bg-flat (not tool-bg) so clusters match the bar — no shadow-xl */
  const barH = "h-10";
  const toolClusterClass = `tool-bg-flat ${barH} shrink-0 !items-stretch !justify-start !gap-0.5 !px-0.5 !py-0 text-neutral-content [&_button.tool-button]:h-full [&_button.tool-button]:min-h-0 [&_button.tool-button]:rounded-md [&_button.tool-button]:px-2`;

  return (
    <div ref={toolbarRef} className="border-base-300 bg-neutral border-b px-4 py-1.5">
      <div className={`flex items-center gap-2 ${barH}`}>
        {/* Search */}
        <div
          className={`input-wrapper input-hover relative flex min-h-0 min-w-0 flex-1 items-center ${barH}`}
        >
          <TbSearch className="text-neutral-content pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search media..."
            className="input-plain-search h-full! min-h-0 pl-10"
          />
        </div>

        {/* View Mode */}
        <div className={toolClusterClass}>
          <button
            onClick={() => setViewMode("cards")}
            type="button"
            className={`tool-button flex h-full items-stretch px-2 ${viewMode === "cards" ? "bg-base-200 text-base-content" : ""}`}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Card view"
            data-tooltip-place="bottom"
            data-tooltip-offset={10}
          >
            <TbLayoutGrid className="size-[18px]" />
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
            <TbList className="size-[18px]" />
          </button>
        </div>

        {/* Sort — ToolbarDropdown (Listbox + ph-select-content), not native <select> */}
        <div className={`${toolClusterClass} min-w-0`}>
          <div className="flex h-full min-h-0 w-full max-w-[11rem] items-stretch [&_button.input-plain]:text-xs">
            <ToolbarDropdown
              wrap="control"
              propKey="media-sort-field"
              placeholder="Sort by"
              value={sortField}
              onChange={(val: string) => {
                setSortField(val as SortField);
                resortFilteredMedia();
              }}
              append={
                <button
                  type="button"
                  onClick={() => {
                    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                    resortFilteredMedia();
                  }}
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
              }
            >
              <option value="createdAt">Date</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
              <option value="order">Order</option>
            </ToolbarDropdown>
          </div>
        </div>

        {/* Add Mode */}
        <div className={toolClusterClass}>
          <AddModeButton
            mode="upload"
            icon={<TbUpload className="size-[18px]" />}
            tooltip="Upload files"
            activeMode={addMode}
            disabled={uploading}
            onClick={() => {
              setAddMode("upload");
              if (addMode === "upload") fileInputRef.current?.click();
            }}
          />
          <AddModeButton
            mode="url"
            icon={<TbExternalLink className="size-[18px]" />}
            tooltip="Add from URL"
            activeMode={addMode}
            onClick={() => setAddMode("url")}
          />
          <AddModeButton
            mode="svg"
            icon={<TbCode className="size-[18px]" />}
            tooltip="Add SVG code"
            activeMode={addMode}
            onClick={() => setAddMode("svg")}
          />
          {canUseImageGenerate && (
            <AddModeButton
              mode="ai"
              icon={<TbWand className="size-[18px]" />}
              tooltip="Generate with AI"
              activeMode={addMode}
              onClick={() => setAddMode("ai")}
            />
          )}
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
            <TbClipboard className="size-[18px]" />
          </button>
        </div>
      </div>

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

      {/* AI panel */}
      {canUseImageGenerate &&
        addMode === "ai" &&
        renderMediaManagerAiPanel?.(mediaManagerAiPanelContext)}

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

function AddModeButton({
  mode,
  icon,
  tooltip,
  activeMode,
  disabled,
  onClick,
}: {
  mode: AddMode;
  icon: React.ReactNode;
  tooltip: string;
  activeMode: AddMode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`tool-button flex h-full items-stretch px-2 ${activeMode === mode ? "bg-base-200 text-base-content" : ""}`}
      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
      data-tooltip-content={tooltip}
      data-tooltip-place="bottom"
      data-tooltip-offset={10}
    >
      {icon}
    </button>
  );
}
