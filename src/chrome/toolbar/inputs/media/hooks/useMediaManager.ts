import { ROOT_NODE } from "@craftjs/utils";
import { useEffect } from "react";
import { useAtomValue } from "@zedux/react";
import { SettingsAtom } from "@/utils/atoms";
import { useSlot } from "@/registry";
import { useAiEnabled } from "@/utils/hooks/useAiEnabled";
import { useAiGeneration } from "./useAiGeneration";
import { useMediaDeleteState } from "./useMediaDeleteState";
import { useMediaEditingState } from "./useMediaEditingState";
import { useMediaFilters } from "./useMediaFilters";
import { useMediaKeyboardShortcuts } from "./useMediaKeyboardShortcuts";
import { useRegisterMediaContext } from "./useRegisterMediaContext";
import { useMediaListState } from "./useMediaListState";
import { useMediaPreviewState } from "./useMediaPreviewState";
import { useMediaSelectionState } from "./useMediaSelectionState";
import { useMediaUpload } from "./useMediaUpload";
import { useMediaViewState } from "./useMediaViewState";
import type { UseMediaManagerOptions } from "./types";

/**
 * Composition root for the Media Manager modal.
 * Combines slice hooks (list / filters / view / selection / preview / delete /
 * editing) and runs the cross-slice effects (refresh-on-open, prune dead
 * selection IDs). Returns one flat object so the 5 importers don't change.
 */
export function useMediaManager({
  isOpen,
  onClose,
  onSelect,
  selectionMode,
}: UseMediaManagerOptions) {
  const aiEnabled = useAiEnabled();
  const settings = useAtomValue(SettingsAtom);

  // `media-edit/ai-actions` is rendered via <SlotRenderer> inside
  // MediaEditModal; here we only need to know whether a contribution exists
  // (gates the "Analyze with AI" affordances at the manager level).
  const mediaEditAiActionsSlot = useSlot("media-edit/ai-actions", undefined);
  const canUseImageGenerate = aiEnabled;
  const canUseImageAnalyze = aiEnabled && mediaEditAiActionsSlot !== null;

  const list = useMediaListState();
  const view = useMediaViewState();

  const filters = useMediaFilters({
    actions: list.actions,
    mediaList: list.mediaList,
    folderNameById: list.folderNameById,
    validFolderIdSet: list.validFolderIdSet,
    searchQuery: view.searchQuery,
    kindFilter: view.kindFilter,
    folderFilter: view.folderFilter,
    sortField: view.sortField,
    sortDirection: view.sortDirection,
  });

  const upload = useMediaUpload({
    isOpen,
    refreshMediaList: list.refreshMediaList,
    generateMetadataForImage: () => {},
  });
  const ai = useAiGeneration({
    refreshMediaList: list.refreshMediaList,
    generateMetadataForImage: () => {},
    setUploading: upload.setUploading,
  });

  const rootNode = list.query.node(ROOT_NODE).get();
  const rootProps = rootNode?.data?.props as Record<string, any> | undefined;
  const design = rootProps?.design as { notes?: unknown; tags?: unknown } | undefined;
  const designContext = {
    designNotes: typeof design?.notes === "string" ? design.notes : undefined,
    designTags: Array.isArray(design?.tags) ? (design.tags as string[]) : undefined,
  };

  const editing = useMediaEditingState({
    query: list.query,
    actions: list.actions,
    ai,
    designContext,
    refreshMediaList: list.refreshMediaList,
  });

  const selection = useMediaSelectionState(filters.filteredMedia, selectionMode);

  const preview = useMediaPreviewState(filters.filteredMedia);

  const del = useMediaDeleteState({
    query: list.query,
    actions: list.actions,
    settings,
    selectedMediaIds: selection.selectedMediaIds,
    refreshMediaList: list.refreshMediaList,
    clearSelection: selection.clearSelection,
  });

  // Folder delete needs to clear folderFilter if active — bridge here
  const deleteFolder = (folderId: string) =>
    list.deleteFolderById(folderId, () => {
      if (view.folderFilter === folderId) view.setFolderFilter("all");
    });

  const moveSelectedToFolder = (folderId: string | null) =>
    list.moveMediaToFolder(selection.selectedMediaIds, folderId);

  // Refresh + reset on open
  useEffect(() => {
    if (isOpen) {
      list.refreshMediaList();
      view.setSearchQuery("");
      selection.clearSelection();
      editing.setEditingMedia(null);
      view.setFolderFilter("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, list.refreshMediaList, selection.clearSelection]);

  // Prune dead selection IDs when mediaList changes
  useEffect(() => {
    selection.setSelectedMediaIds(prev =>
      prev.filter(id => list.mediaList.some(media => media.id === id))
    );
    selection.setSelectedMedia(prev =>
      prev && list.mediaList.some(media => media.id === prev) ? prev : null
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.mediaList]);

  useMediaKeyboardShortcuts({
    isOpen,
    selectionMode,
    onSelect,
    onClose,
    filteredMedia: filters.filteredMedia,
    selectedMedia: selection.selectedMedia,
    selectedMediaIds: selection.selectedMediaIds,
    previewMedia: preview.previewMedia,
    editingMedia: editing.editingMedia,
    viewMode: view.viewMode,
    clearSelection: selection.clearSelection,
    selectSingle: selection.selectSingle,
    setPreviewMedia: preview.setPreviewMedia,
  });

  // Publish modal state + live select-all / delete callbacks so the
  // registry-dispatched ⌘A / Backspace chords (`ph.media.selectAll`,
  // `ph.media.deleteSelected`) can reach this surface.
  useRegisterMediaContext({
    isOpen: isOpen && !preview.previewMedia && !editing.editingMedia,
    selectionMode,
    selectedCount: selection.selectedMediaIds.length,
    selectAllVisible: selection.selectAllVisible,
    handleDeleteSelected: del.handleDeleteSelected,
  });

  const canEditSelected = selection.selectedMediaIds.length === 1;

  return {
    mediaList: list.mediaList,
    filteredMedia: filters.filteredMedia,
    folders: list.folders,
    folderNameById: list.folderNameById,
    folderCounts: list.folderCounts,
    folderFilter: view.folderFilter,
    searchQuery: view.searchQuery,
    selectedMedia: selection.selectedMedia,
    selectedMediaIds: selection.selectedMediaIds,
    editingMedia: editing.editingMedia,
    cropMedia: editing.cropMedia,
    viewMode: view.viewMode,
    sortField: view.sortField,
    sortDirection: view.sortDirection,
    kindFilter: view.kindFilter,
    previewMedia: preview.previewMedia,
    deleteConfirm: del.deleteConfirm,
    deletingMedia: del.deletingMedia,
    savingMetadata: editing.savingMetadata,

    uploading: upload.uploading,
    uploadProgress: upload.uploadProgress,
    uploadError: upload.uploadError,
    addMode: upload.addMode,
    urlInput: upload.urlInput,
    svgInput: upload.svgInput,
    saveUrlToCdn: upload.saveUrlToCdn,
    hasImageInClipboard: upload.hasImageInClipboard,
    isDragOver: upload.isDragOver,
    dropProps: upload.dropProps,
    replacingMedia: upload.replacingMedia,
    fileInputRef: upload.fileInputRef,
    replaceInputRef: upload.replaceInputRef,
    toolbarRef: upload.toolbarRef,

    canUseImageAnalyze,
    canUseImageGenerate,
    canEditSelected,
    mediaEditAiActionsContext: editing.mediaEditAiActionsContext,

    setSearchQuery: view.setSearchQuery,
    setSelectedMedia: selection.setSelectedMedia,
    setViewMode: view.setViewMode,
    setSortField: view.setSortField,
    setSortDirection: view.setSortDirection,
    setKindFilter: view.handleKindFilterChange,
    setFolderFilter: view.setFolderFilter,
    setPreviewMedia: preview.setPreviewMedia,
    setCropMedia: editing.setCropMedia,
    setEditingMedia: editing.setEditingMedia,
    setAddMode: upload.setAddMode,
    setUrlInput: upload.setUrlInput,
    setSvgInput: upload.setSvgInput,
    setSaveUrlToCdn: upload.setSaveUrlToCdn,
    setUploadError: upload.setUploadError,
    setReplacingMedia: upload.setReplacingMedia,
    setDeleteConfirm: del.setDeleteConfirm,

    handleSearch: view.handleSearch,
    handleDelete: del.handleDelete,
    handleDeleteSelected: del.handleDeleteSelected,
    confirmDelete: del.confirmDelete,
    handlePreviewNext: preview.handlePreviewNext,
    handlePreviewPrevious: preview.handlePreviewPrevious,
    handleReorder: filters.handleReorder,
    handleSaveCroppedImage: editing.handleSaveCroppedImage,
    handleMediaSelection: selection.handleMediaSelection,
    clearSelection: selection.clearSelection,
    selectAllVisible: selection.selectAllVisible,
    openEditModal: editing.openEditModal,
    closeEditModal: editing.closeEditModal,
    saveEditedMetadata: editing.saveEditedMetadata,
    handleUpload: upload.handleUpload,
    handleReplaceMedia: upload.handleReplaceMedia,
    handleAddUrl: upload.handleAddUrl,
    handleAddSvg: upload.handleAddSvg,
    handlePasteClick: upload.handlePasteClick,

    createFolder: list.createFolder,
    renameFolder: list.renameFolder,
    deleteFolder,
    moveMediaToFolder: list.moveMediaToFolder,
    moveSelectedToFolder,

    selectionMode,
    onSelect,
    onClose,
    settings,
    resortFilteredMedia: filters.resortFilteredMedia,
  };
}

export type UseMediaManagerReturn = ReturnType<typeof useMediaManager>;
