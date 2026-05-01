import { useMemo } from "react";
import { getUploadAccept } from "@/utils/media/upload";
import { getMediaKind, getReplaceAccept, type MediaKind } from "../../utils/media-helpers";
import type { UseMediaManagerReturn } from "../../hooks/useMediaManager";
import { AddModeCluster } from "./AddModeCluster";
import { CompactSearchBar } from "./CompactSearchBar";
import { FolderCluster } from "./FolderCluster";
import { HiddenFileInputs } from "./HiddenFileInputs";
import { ItemCountText } from "./ItemCountText";
import { KindFilterCluster } from "./KindFilterCluster";
import { SearchToggle } from "./SearchToggle";
import { SelectionCluster } from "./SelectionCluster";
import { SortCluster } from "./SortCluster";
import { SvgInputMode } from "./SvgInputMode";
import { UrlInputMode } from "./UrlInputMode";
import { useCompactSearch } from "./useCompactSearch";
import { ViewModeCluster } from "./ViewModeCluster";

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
    setViewMode,
    setSortField,
    setSortDirection,
    setKindFilter,
    setAddMode,
    setUrlInput,
    setSvgInput,
    setSaveUrlToCdn,
    handleSearch,
    handleUpload,
    handleAddUrl,
    handleAddSvg,
    handlePasteClick,
    handleReplaceMedia,
    resortFilteredMedia,
    onClose,
  } = manager;

  const { showCompactSearch, setShowCompactSearch, compactSearchInputRef } =
    useCompactSearch(toolbarRef);

  const replaceTarget = replacingMedia ? mediaList.find(m => m.id === replacingMedia) : null;
  const replaceAccept = replaceTarget ? getReplaceAccept(replaceTarget) : getUploadAccept();

  const kindCounts = useMemo(
    () =>
      mediaList.reduce(
        (acc, item) => {
          const kind = getMediaKind(item);
          acc[kind] = (acc[kind] || 0) + 1;
          return acc;
        },
        {} as Record<MediaKind, number>
      ),
    [mediaList]
  );

  const handleChangeSortField = (field: typeof sortField) => {
    setSortField(field);
    resortFilteredMedia({ sortField: field });
  };

  const toggleSortDirection = () => {
    const nextDirection = sortDirection === "asc" ? "desc" : "asc";
    setSortDirection(nextDirection);
    resortFilteredMedia({ sortDirection: nextDirection });
  };

  return (
    <div ref={toolbarRef} className="border-base-300 bg-neutral border-b px-3 py-1">
      <div>
        <div className="flex w-full min-w-0 items-center gap-1">
          <SearchToggle
            showCompactSearch={showCompactSearch}
            hasSearchQuery={!!searchQuery}
            onToggle={() => setShowCompactSearch(prev => !prev)}
          />

          <ViewModeCluster viewMode={viewMode} setViewMode={setViewMode} />

          <SortCluster
            sortField={sortField}
            sortDirection={sortDirection}
            onChangeSortField={handleChangeSortField}
            onToggleDirection={toggleSortDirection}
          />

          <KindFilterCluster
            mediaList={mediaList}
            kindCounts={kindCounts}
            onChange={setKindFilter}
          />

          <AddModeCluster
            addMode={addMode}
            uploading={uploading}
            hasImageInClipboard={hasImageInClipboard}
            canUseImageGenerate={canUseImageGenerate}
            fileInputRef={fileInputRef}
            setAddMode={setAddMode}
            handlePasteClick={handlePasteClick}
            onClose={onClose}
          />

          {!selectionMode && (
            <FolderCluster
              filteredCount={filteredCount}
              busy={busy}
              canRenameOrDeleteFolder={canRenameOrDeleteFolder}
              onSelectVisible={onSelectVisible}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
            />
          )}

          {!selectionMode && selectedCount > 0 && (
            <SelectionCluster
              busy={busy}
              folders={folders}
              singleSelectedId={singleSelectedId}
              onMoveSelectedToFolder={onMoveSelectedToFolder}
              onPreviewSingleSelected={onPreviewSingleSelected}
              onEditSingleSelected={onEditSingleSelected}
              onCropSingleSelected={onCropSingleSelected}
              onReplaceSingleSelected={onReplaceSingleSelected}
              onDeleteSelected={onDeleteSelected}
              onClearSelection={onClearSelection}
            />
          )}

          <ItemCountText
            selectionMode={selectionMode}
            selectedCount={selectedCount}
            filteredCount={filteredCount}
            totalCount={totalCount}
            searchQuery={searchQuery}
          />
        </div>
      </div>

      {showCompactSearch && (
        <CompactSearchBar
          inputRef={compactSearchInputRef}
          searchQuery={searchQuery}
          onSearch={handleSearch}
        />
      )}

      {addMode === "url" && (
        <UrlInputMode
          urlInput={urlInput}
          saveUrlToCdn={saveUrlToCdn}
          uploading={uploading}
          setUrlInput={setUrlInput}
          setSaveUrlToCdn={setSaveUrlToCdn}
          handleAddUrl={handleAddUrl}
        />
      )}

      {addMode === "svg" && (
        <SvgInputMode svgInput={svgInput} setSvgInput={setSvgInput} handleAddSvg={handleAddSvg} />
      )}

      <HiddenFileInputs
        fileInputRef={fileInputRef}
        replaceInputRef={replaceInputRef}
        replaceAccept={replaceAccept}
        handleUpload={handleUpload}
        handleReplaceMedia={handleReplaceMedia}
      />
    </div>
  );
}
