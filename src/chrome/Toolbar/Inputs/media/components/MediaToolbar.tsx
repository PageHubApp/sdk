import { Tooltip } from "components/layout/Tooltip";
import {
  TbArrowDown,
  TbArrowUp,
  TbClipboard,
  TbCode,
  TbExternalLink,
  TbInfoCircle,
  TbSearch,
  TbSparkles,
  TbUpload,
  TbLayoutGrid,
  TbList,
} from "react-icons/tb";
import type { AddMode, SortField } from "../utils/media-helpers";
import { AiGeneratePanel } from "./AiGeneratePanel";
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
    // AI
    aiPrompt,
    aiModel,
    aiError,
    aiSuccess,
    aiImagePreview,
    aiImageScale,
    aiImagePosition,
    isGeneratingAi,
    isDragging,
    setAiPrompt,
    setAiModel,
    setAiImageScale,
    handleGenerateAiImage,
    handleSaveAiImage,
    resetImageView,
    handleImageMouseDown,
    handleImageMouseMove,
    handleImageMouseUp,
    handleWheel,
  } = manager;

  return (
    <div ref={toolbarRef} className="border-b border-base-300 bg-neutral px-4 py-1.5">
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="input-wrapper relative input-hover flex-1 min-w-0">
          <TbSearch className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-neutral-content" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search media..."
            className="input-plain-search pl-10"
          />
        </div>

        {/* View Mode */}
        <div className="tool-bg gap-1! text-neutral-content">
          <Tooltip content="Card view" placement="bottom">
            <button
              onClick={() => setViewMode("cards")}
              type="button"
              className={`tool-button px-2 ${viewMode === "cards" ? "bg-neutral text-base-content shadow-sm" : ""}`}
            >
              <TbLayoutGrid className="size-5" />
            </button>
          </Tooltip>
          <Tooltip content="List view" placement="bottom">
            <button
              onClick={() => setViewMode("list")}
              type="button"
              className={`tool-button px-2 ${viewMode === "list" ? "bg-neutral text-base-content shadow-sm" : ""}`}
            >
              <TbList className="size-5" />
            </button>
          </Tooltip>
        </div>

        {/* Sort */}
        <div className="tool-bg gap-1! text-neutral-content">
          <Tooltip content="Sort by" placement="bottom">
            <select
              value={sortField}
              onChange={e => {
                setSortField(e.target.value as SortField);
                resortFilteredMedia();
              }}
              className="input-plain max-w-[6rem] cursor-pointer text-xs"
            >
              <option value="createdAt">Date</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
              <option value="order">Order</option>
            </select>
          </Tooltip>
          <Tooltip
            content={`Sort ${sortDirection === "asc" ? "ascending" : "descending"}`}
            placement="bottom"
          >
            <button
              type="button"
              onClick={() => {
                setSortDirection(sortDirection === "asc" ? "desc" : "asc");
                resortFilteredMedia();
              }}
              className="tool-button"
            >
              {sortDirection === "asc" ? (
                <TbArrowUp className="size-3" />
              ) : (
                <TbArrowDown className="size-3" />
              )}
            </button>
          </Tooltip>
        </div>

        {/* Add Mode */}
        <div className="tool-bg gap-1! text-neutral-content">
          <AddModeButton
            mode="upload"
            icon={<TbUpload className="inline" />}
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
            icon={<TbExternalLink className="inline" />}
            tooltip="Add from URL"
            activeMode={addMode}
            onClick={() => setAddMode("url")}
          />
          <AddModeButton
            mode="svg"
            icon={<TbCode className="inline" />}
            tooltip="Add SVG code"
            activeMode={addMode}
            onClick={() => setAddMode("svg")}
          />
          {canUseImageGenerate && (
            <AddModeButton
              mode="ai"
              icon={<TbSparkles className="inline" />}
              tooltip="Generate with AI"
              activeMode={addMode}
              onClick={() => setAddMode("ai")}
            />
          )}
          <Tooltip
            content={
              hasImageInClipboard
                ? "Paste image from clipboard (Ctrl+V / Cmd+V)"
                : "No image in clipboard"
            }
            placement="bottom"
          >
            <button
              type="button"
              onClick={handlePasteClick}
              disabled={!hasImageInClipboard || uploading}
              className="tool-button px-3"
            >
              <TbClipboard className="inline" />
            </button>
          </Tooltip>
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
              className="input-dialog flex-1 placeholder:text-neutral-content"
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
              className="size-4 rounded-lg border-base-300 bg-neutral text-accent focus:ring-ring"
            />
            <label htmlFor="saveUrlToCdn" className="text-xs text-neutral-content">
              Save to CDN (downloads image to your account)
            </label>
          </div>
          <div className="mt-2 text-xs text-neutral-content">
            <TbInfoCircle className="mr-1 inline" /> Tip: You can also paste images directly
            (Ctrl+V / Cmd+V) or use the clipboard button above!
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
              className="input-dialog flex-1 min-h-[4.5rem] resize-none font-mono text-xs placeholder:text-neutral-content"
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
          <p className="ml-0.5 mt-1.5 text-xs text-neutral-content">
            Find SVGs @{" "}
            <a
              href="https://www.svgrepo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary"
            >
              svgrepo.com
            </a>
          </p>
        </div>
      )}

      {/* AI panel */}
      {canUseImageGenerate && addMode === "ai" && (
        <AiGeneratePanel
          aiPrompt={aiPrompt}
          aiModel={aiModel}
          aiError={aiError}
          aiSuccess={aiSuccess}
          aiImagePreview={aiImagePreview}
          aiImageScale={aiImageScale}
          aiImagePosition={aiImagePosition}
          isGeneratingAi={isGeneratingAi}
          isDragging={isDragging}
          uploading={uploading}
          onPromptChange={setAiPrompt}
          onModelChange={setAiModel}
          onGenerate={handleGenerateAiImage}
          onSave={handleSaveAiImage}
          onScaleChange={setAiImageScale}
          onResetView={resetImageView}
          onMouseDown={handleImageMouseDown}
          onMouseMove={handleImageMouseMove}
          onMouseUp={handleImageMouseUp}
          onWheel={handleWheel}
        />
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/avif,image/svg+xml"
        multiple
        onChange={e => handleUpload(e.target.files)}
        className="hidden"
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/avif,image/svg+xml"
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
    <Tooltip content={tooltip} placement="bottom">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`tool-button px-3 ${activeMode === mode ? "bg-neutral text-base-content shadow-sm" : ""}`}
      >
        {icon}
      </button>
    </Tooltip>
  );
}
