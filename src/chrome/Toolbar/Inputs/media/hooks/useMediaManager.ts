import { ROOT_NODE, useEditor } from "@craftjs/core";
import { useCallback, useEffect, useState } from "react";
import { useAtomValue } from "@zedux/react";
import { SettingsAtom } from "utils/atoms";
import { getPageMedia, updateMediaMetadata } from "utils/lib";
import { DeleteMedia } from "../../../../Viewport/lib";
import { useResizable } from "../../../../hooks/useResizable";
import { cleanSvg, sortMedia, type MediaItem, type SortDirection, type SortField } from "../utils/media-helpers";
import { useMediaUpload } from "./useMediaUpload";
import { useAiGeneration } from "./useAiGeneration";

interface UseMediaManagerOptions {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (mediaId: string) => void;
  selectionMode: boolean;
}

export function useMediaManager({ isOpen, onClose, onSelect, selectionMode }: UseMediaManagerOptions) {
  const { query, actions } = useEditor();
  const settings = useAtomValue(SettingsAtom);

  // Resizable modal
  const { width: mmWidth, height: mmHeight, handleProps: mmHandleProps } = useResizable({
    storageKey: "media-manager",
    defaultWidth: 896,
    defaultHeight: Math.round(window.innerHeight * 0.9),
    minWidth: 500,
    maxWidth: 1200,
    minHeight: 400,
    maxHeight: Math.round(window.innerHeight * 0.95),
    edges: ["e", "s", "se", "w", "sw"],
  });

  // ─── Core media state ───
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [filteredMedia, setFilteredMedia] = useState<MediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [cropMedia, setCropMedia] = useState<MediaItem | null>(null);

  // ─── View state ───
  const [viewMode, setViewMode] = useState<"cards" | "list">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pagehub-media-manager-view");
      return saved === "list" || saved === "cards" ? saved : "cards";
    }
    return "cards";
  });
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);

  // ─── Delete state ───
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    mediaId: string | null;
  }>({ isOpen: false, mediaId: null });
  const [deletingMedia, setDeletingMedia] = useState<string[]>([]);

  // ─── Metadata editing state ───
  const [savingMetadata, setSavingMetadata] = useState<"idle" | "saving" | "saved">("idle");

  // ─── Derived helpers ───

  const refreshMediaList = useCallback(() => {
    const media = getPageMedia(query);
    setMediaList(media);
    setFilteredMedia(sortMedia(media, sortField, sortDirection));
  }, [query, sortField, sortDirection]);

  // ─── Compose sub-hooks ───
  // Each sub-hook handles its own AI metadata generation internally
  // via their own SDK/editor context access

  const upload = useMediaUpload({ isOpen, refreshMediaList, generateMetadataForImage: () => {} });
  const ai = useAiGeneration({ refreshMediaList, generateMetadataForImage: () => {}, setUploading: () => {} });

  // ─── Core handlers ───

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setFilteredMedia(sortMedia(mediaList, sortField, sortDirection));
      return;
    }
    const searchLower = q.toLowerCase();
    const filtered = mediaList.filter(media =>
      media.id.toLowerCase().includes(searchLower) ||
      media.metadata?.title?.toLowerCase().includes(searchLower) ||
      media.metadata?.alt?.toLowerCase().includes(searchLower) ||
      media.metadata?.description?.toLowerCase().includes(searchLower)
    );
    setFilteredMedia(sortMedia(filtered, sortField, sortDirection));
  };

  const handleDelete = (mediaId: string) => {
    setDeleteConfirm({ isOpen: true, mediaId });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.mediaId) return;
    const mediaIdToDelete = deleteConfirm.mediaId;

    setDeleteConfirm({ isOpen: false, mediaId: null });
    setDeletingMedia(prev => [...prev, mediaIdToDelete]);

    try {
      await DeleteMedia(mediaIdToDelete, settings, query, actions);
    } catch (error) {
      console.error("Failed to delete media:", error);
    }

    actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
      const pageMedia = props.pageMedia as MediaItem[] | undefined;
      if (!pageMedia) return;
      props.pageMedia = pageMedia.filter(m => m.id !== mediaIdToDelete);
    });

    refreshMediaList();
    setSelectedMedia(null);
    setDeletingMedia(prev => prev.filter(id => id !== mediaIdToDelete));
  };

  const handlePreviewNext = () => {
    if (!previewMedia) return;
    const idx = filteredMedia.findIndex(m => m.id === previewMedia);
    if (idx < filteredMedia.length - 1) setPreviewMedia(filteredMedia[idx + 1].id);
  };

  const handlePreviewPrevious = () => {
    if (!previewMedia) return;
    const idx = filteredMedia.findIndex(m => m.id === previewMedia);
    if (idx > 0) setPreviewMedia(filteredMedia[idx - 1].id);
  };

  const handleReorder = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const draggedIndex = filteredMedia.findIndex(m => m.id === draggedId);
    const targetIndex = filteredMedia.findIndex(m => m.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...filteredMedia];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    const updatedMedia = newOrder.map((media, index) => ({ ...media, order: index }));

    actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
      const pageMedia = props.pageMedia as MediaItem[] | undefined;
      if (!pageMedia) return;
      props.pageMedia = pageMedia.map(m => {
        const updatedItem = updatedMedia.find(u => u.id === m.id);
        return updatedItem ? { ...m, order: updatedItem.order } : m;
      });
    });

    setFilteredMedia(updatedMedia);
  };

  const handleSaveCroppedImage = (croppedImage: MediaItem) => {
    actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
      const pageMedia = props.pageMedia as MediaItem[] | undefined;
      if (!pageMedia) return;
      props.pageMedia = [...pageMedia, croppedImage];
    });
    refreshMediaList();
    setCropMedia(null);
  };

  // ─── Edit metadata ───

  const openEditModal = (media: MediaItem) => {
    setEditingMedia({
      ...media,
      metadata: {
        alt: media.metadata?.alt || "",
        title: media.metadata?.title || "",
        description: media.metadata?.description || "",
        url: media.metadata?.url || "",
        svg: media.metadata?.svg || "",
      },
    });
    setSavingMetadata("idle");
  };

  const closeEditModal = () => {
    setEditingMedia(null);
    setSavingMetadata("idle");
  };

  const saveEditedMetadata = async () => {
    if (!editingMedia) return;
    setSavingMetadata("saving");

    try {
      const metadata = { ...editingMedia.metadata };
      if (editingMedia.type === "svg" && metadata?.svg) {
        const cleaned = cleanSvg(metadata.svg);
        metadata.svg = cleaned;
        metadata.size = new Blob([cleaned]).size;
      }

      await new Promise(resolve => setTimeout(resolve, 300));
      updateMediaMetadata(query, actions, editingMedia.id, metadata);
      refreshMediaList();
      setSavingMetadata("saved");
      setTimeout(() => setSavingMetadata("idle"), 2000);
    } catch (error) {
      console.error("Failed to save metadata:", error);
      setSavingMetadata("idle");
    }
  };

  const handleGenerateMetadata = async () => {
    if (!editingMedia) return;
    const result = await ai.handleGenerateMetadata(editingMedia);
    if (result) {
      setEditingMedia({
        ...editingMedia,
        metadata: { ...editingMedia.metadata, ...result },
      });
    }
  };

  // ─── Effects ───

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("pagehub-media-manager-view", viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    if (upload.addMode === "ai" && !ai.canUseImageGenerate) {
      upload.setAddMode("upload");
    }
  }, [upload.addMode, ai.canUseImageGenerate]);

  useEffect(() => {
    if (isOpen) {
      refreshMediaList();
      setSearchQuery("");
      setSelectedMedia(null);
      setEditingMedia(null);
    }
  }, [isOpen, refreshMediaList]);

  useEffect(() => {
    if (!previewMedia) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewMedia(null);
      else if (e.key === "ArrowLeft") handlePreviewPrevious();
      else if (e.key === "ArrowRight") handlePreviewNext();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [previewMedia, filteredMedia]);

  // ─── Flat return (matches UseMediaManagerReturn consumed by components) ───

  return {
    // Resizable
    mmWidth, mmHeight, mmHandleProps,
    // Core state
    mediaList, filteredMedia, searchQuery, selectedMedia, editingMedia, cropMedia,
    viewMode, sortField, sortDirection, previewMedia,
    deleteConfirm, deletingMedia, savingMetadata,
    // Upload (delegated)
    uploading: upload.uploading,
    uploadProgress: upload.uploadProgress,
    uploadError: upload.uploadError,
    conversionDialog: upload.conversionDialog,
    addMode: upload.addMode,
    urlInput: upload.urlInput,
    svgInput: upload.svgInput,
    saveUrlToCdn: upload.saveUrlToCdn,
    hasImageInClipboard: upload.hasImageInClipboard,
    isDragOver: upload.isDragOver,
    dropProps: upload.dropProps,
    fileInputRef: upload.fileInputRef,
    replaceInputRef: upload.replaceInputRef,
    toolbarRef: upload.toolbarRef,
    // AI (delegated)
    canUseImageAnalyze: ai.canUseImageAnalyze,
    canUseImageGenerate: ai.canUseImageGenerate,
    aiPrompt: ai.aiPrompt,
    aiModel: ai.aiModel,
    aiImagePreview: ai.aiImagePreview,
    aiOptimizedPrompt: ai.aiOptimizedPrompt,
    aiClaudeUsage: ai.aiClaudeUsage,
    aiImageScale: ai.aiImageScale,
    aiImagePosition: ai.aiImagePosition,
    aiError: ai.aiError,
    aiSuccess: ai.aiSuccess,
    isGeneratingAi: ai.isGeneratingAi,
    isDragging: ai.isDragging,
    isGeneratingMetadata: ai.isGeneratingMetadata,
    // Setters
    setSearchQuery, setSelectedMedia, setViewMode, setSortField, setSortDirection,
    setPreviewMedia, setCropMedia, setEditingMedia,
    setAddMode: upload.setAddMode,
    setUrlInput: upload.setUrlInput,
    setSvgInput: upload.setSvgInput,
    setSaveUrlToCdn: upload.setSaveUrlToCdn,
    setUploadError: upload.setUploadError,
    setConversionDialog: upload.setConversionDialog,
    setReplacingMedia: upload.setReplacingMedia,
    setAiPrompt: ai.setAiPrompt,
    setAiModel: ai.setAiModel,
    setAiImageScale: ai.setAiImageScale,
    setDeleteConfirm,
    // Handlers
    handleSearch, handleDelete, confirmDelete,
    handlePreviewNext, handlePreviewPrevious,
    handleReorder, handleSaveCroppedImage,
    openEditModal, closeEditModal, saveEditedMetadata, handleGenerateMetadata,
    handleUpload: upload.handleUpload,
    handleConvertAndUpload: upload.handleConvertAndUpload,
    handleReplaceMedia: upload.handleReplaceMedia,
    handleAddUrl: upload.handleAddUrl,
    handleAddSvg: upload.handleAddSvg,
    handlePasteClick: upload.handlePasteClick,
    handleGenerateAiImage: ai.handleGenerateAiImage,
    handleSaveAiImage: ai.handleSaveAiImage,
    handleImageMouseDown: ai.handleImageMouseDown,
    handleImageMouseMove: ai.handleImageMouseMove,
    handleImageMouseUp: ai.handleImageMouseUp,
    handleWheel: ai.handleWheel,
    resetImageView: ai.resetImageView,
    // Misc
    selectionMode, onSelect, onClose, settings,
    resortFilteredMedia: () => setFilteredMedia(sortMedia(filteredMedia, sortField, sortDirection)),
  };
}

export type UseMediaManagerReturn = ReturnType<typeof useMediaManager>;
