import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtomState, useAtomValue } from "@zedux/react";
import { AssistantMediaMetadataResultAtom, SettingsAtom } from "@/utils/atoms";
import { getCdnUrl } from "@/utils/cdn";
import { getPageMedia, updateMediaMetadata } from "@/utils/lib";
import { DeleteMedia } from "@/chrome/viewport/viewportExports";
import { useSDK } from "@/core/context";
import { useAiEnabled } from "@/utils/hooks/useAiEnabled";
import type {
  PageHubMediaEditAiActionsContext,
  PageHubMediaMetadataSuggestion,
} from "@/types";
import {
  cleanSvg,
  getMediaKind,
  MEDIA_KIND_LABELS,
  sortMedia,
  type MediaFolder,
  type MediaItem,
  type MediaKind,
  type SortDirection,
  type SortField,
} from "../utils/media-helpers";
import { useMediaUpload } from "./useMediaUpload";
import { useAiGeneration } from "./useAiGeneration";
import { phStorage } from "@/utils/phStorage";

interface UseMediaManagerOptions {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (mediaId: string) => void;
  selectionMode: boolean;
}

type FolderFilter = "all" | "unfiled" | string;

type SelectionModifiers = {
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
};

function normalizeFolders(input: unknown): MediaFolder[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item: any, index: number) => {
      const name = typeof item?.name === "string" ? item.name.trim() : "";
      const id = typeof item?.id === "string" ? item.id : "";
      if (!name || !id) return null;
      const now = Date.now();
      return {
        id,
        name,
        order: Number.isFinite(item?.order) ? Number(item.order) : index,
        createdAt: Number.isFinite(item?.createdAt) ? Number(item.createdAt) : now,
        updatedAt: Number.isFinite(item?.updatedAt) ? Number(item.updatedAt) : now,
      } as MediaFolder;
    })
    .filter((item): item is MediaFolder => !!item)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export function useMediaManager({
  isOpen,
  onClose,
  onSelect,
  selectionMode,
}: UseMediaManagerOptions) {
  const { query, actions } = useEditor();
  const { config } = useSDK();
  const aiEnabled = useAiEnabled();
  const settings = useAtomValue(SettingsAtom);
  const [assistantMediaMetadataResult, setAssistantMediaMetadataResult] = useAtomState(
    AssistantMediaMetadataResultAtom
  );

  const mediaEditAiActionsSlot = config.editorChromeSlots?.renderMediaEditAiActions;

  const canUseImageGenerate = aiEnabled;
  const canUseImageAnalyze = aiEnabled && typeof mediaEditAiActionsSlot === "function";

  // ─── Core media state ───
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [filteredMedia, setFilteredMedia] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const lastSelectedMediaIdRef = useRef<string | null>(null);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [cropMedia, setCropMedia] = useState<MediaItem | null>(null);

  // ─── View state ───
  const [viewMode, setViewMode] = useState<"cards" | "list">(() => {
    if (typeof window !== "undefined") {
      const saved = phStorage.get("media-view");
      return saved === "list" || saved === "cards" ? saved : "cards";
    }
    return "cards";
  });
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [kindFilter, setKindFilter] = useState<MediaKind | "all">("all");
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const [previewMedia, setPreviewMedia] = useState<string | null>(null);

  // ─── Delete state ───
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    mediaIds: string[];
  }>({ isOpen: false, mediaIds: [] });
  const [deletingMedia, setDeletingMedia] = useState<string[]>([]);

  // ─── Metadata editing state ───
  const [savingMetadata, setSavingMetadata] = useState<"idle" | "saving" | "saved">("idle");

  const folderNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const folder of folders) map.set(folder.id, folder.name);
    return map;
  }, [folders]);

  const validFolderIdSet = useMemo(() => new Set(folders.map(folder => folder.id)), [folders]);

  const applyFilters = useCallback(
    (
      media: MediaItem[],
      override?: {
        kind?: MediaKind | "all";
        folder?: FolderFilter;
        search?: string;
        sortField?: SortField;
        sortDirection?: SortDirection;
      }
    ): MediaItem[] => {
      const k = override?.kind ?? kindFilter;
      const f = override?.folder ?? folderFilter;
      const s = override?.search ?? searchQuery;
      const sf = override?.sortField ?? sortField;
      const sd = override?.sortDirection ?? sortDirection;
      let out = media;

      if (k !== "all") out = out.filter(m => getMediaKind(m) === k);

      if (f === "unfiled") {
        out = out.filter(m => {
          const folderId = m.metadata?.folderId;
          return !folderId || !validFolderIdSet.has(folderId);
        });
      } else if (f !== "all") {
        out = out.filter(m => m.metadata?.folderId === f);
      }

      if (s.trim()) {
        const q = s.toLowerCase();
        out = out.filter(m => {
          const kindLabel = MEDIA_KIND_LABELS[getMediaKind(m)].toLowerCase();
          const folderName = m.metadata?.folderId
            ? (folderNameById.get(m.metadata.folderId) || "")
            : "unfiled";
          const haystack = [
            m.id,
            m.metadata?.title,
            m.metadata?.alt,
            m.metadata?.description,
            m.metadata?.contentType,
            kindLabel,
            folderName,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        });
      }

      return sortMedia(out, sf, sd);
    },
    [folderFilter, folderNameById, kindFilter, searchQuery, sortDirection, sortField, validFolderIdSet]
  );

  const refreshMediaList = useCallback(() => {
    const media = getPageMedia(query);
    const rootNode = query.node(ROOT_NODE).get();
    const rootProps = rootNode?.data?.props as Record<string, unknown> | undefined;
    const nextFolders = normalizeFolders(rootProps?.mediaFolders);

    setMediaList(media);
    setFolders(nextFolders);
  }, [query]);

  const upload = useMediaUpload({ isOpen, refreshMediaList, generateMetadataForImage: () => {} });
  const ai = useAiGeneration({
    refreshMediaList,
    generateMetadataForImage: () => {},
    setUploading: upload.setUploading,
  });

  const rootNode = query.node(ROOT_NODE).get();
  const rootProps = rootNode?.data?.props as Record<string, any> | undefined;
  const design = rootProps?.design as { notes?: unknown; tags?: unknown } | undefined;
  const designContext = {
    designNotes: typeof design?.notes === "string" ? design.notes : undefined,
    designTags: Array.isArray(design?.tags) ? (design.tags as string[]) : undefined,
  };

  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let unfiled = 0;
    for (const media of mediaList) {
      const folderId = media.metadata?.folderId;
      if (!folderId || !validFolderIdSet.has(folderId)) {
        unfiled += 1;
        continue;
      }
      counts.set(folderId, (counts.get(folderId) ?? 0) + 1);
    }
    return {
      all: mediaList.length,
      unfiled,
      byId: counts,
    };
  }, [mediaList, validFolderIdSet]);

  const clearSelection = useCallback(() => {
    setSelectedMediaIds([]);
    setSelectedMedia(null);
    lastSelectedMediaIdRef.current = null;
  }, []);

  const selectSingle = useCallback((mediaId: string | null) => {
    if (!mediaId) {
      setSelectedMediaIds([]);
      setSelectedMedia(null);
      lastSelectedMediaIdRef.current = null;
      return;
    }
    setSelectedMedia(mediaId);
    setSelectedMediaIds([mediaId]);
    lastSelectedMediaIdRef.current = mediaId;
  }, []);

  const handleMediaSelection = useCallback(
    (mediaId: string, modifiers?: SelectionModifiers) => {
      if (selectionMode) {
        selectSingle(mediaId);
        return;
      }

      const shiftKey = !!modifiers?.shiftKey;
      const toggle = !!modifiers?.metaKey || !!modifiers?.ctrlKey;

      if (shiftKey && lastSelectedMediaIdRef.current) {
        const startIndex = filteredMedia.findIndex(m => m.id === lastSelectedMediaIdRef.current);
        const endIndex = filteredMedia.findIndex(m => m.id === mediaId);
        if (startIndex > -1 && endIndex > -1) {
          const [from, to] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];
          const rangeIds = filteredMedia.slice(from, to + 1).map(m => m.id);
          setSelectedMediaIds(prev => {
            if (toggle) return Array.from(new Set([...prev, ...rangeIds]));
            return rangeIds;
          });
          setSelectedMedia(mediaId);
          lastSelectedMediaIdRef.current = mediaId;
          return;
        }
      }

      if (toggle) {
        setSelectedMediaIds(prev => {
          if (prev.includes(mediaId)) return prev.filter(id => id !== mediaId);
          return [...prev, mediaId];
        });
        setSelectedMedia(mediaId);
        lastSelectedMediaIdRef.current = mediaId;
        return;
      }

      selectSingle(mediaId);
    },
    [filteredMedia, selectSingle, selectionMode]
  );

  const selectAllVisible = useCallback(() => {
    if (selectionMode) return;
    const ids = filteredMedia.map(item => item.id);
    setSelectedMediaIds(ids);
    setSelectedMedia(ids[0] || null);
    lastSelectedMediaIdRef.current = ids[ids.length - 1] || null;
  }, [filteredMedia, selectionMode]);

  const persistFolders = useCallback(
    (nextFolders: MediaFolder[]) => {
      actions.setProp(ROOT_NODE, (props: Record<string, any>) => {
        props.mediaFolders = nextFolders;
      });
      setFolders(nextFolders);
    },
    [actions]
  );

  const createFolder = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const now = Date.now();
      const folder: MediaFolder = {
        id: `folder_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        name: trimmed,
        order: folders.length,
        createdAt: now,
        updatedAt: now,
      };
      persistFolders([...folders, folder]);
      return folder;
    },
    [folders, persistFolders]
  );

  const renameFolder = useCallback(
    (folderId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const next = folders.map(folder =>
        folder.id === folderId ? { ...folder, name: trimmed, updatedAt: Date.now() } : folder
      );
      persistFolders(next);
    },
    [folders, persistFolders]
  );

  const deleteFolder = useCallback(
    (folderId: string) => {
      const nextFolders = folders.filter(folder => folder.id !== folderId);
      actions.setProp(ROOT_NODE, (props: Record<string, any>) => {
        props.mediaFolders = nextFolders;
        if (!Array.isArray(props.pageMedia)) return;
        props.pageMedia = props.pageMedia.map((media: MediaItem) => {
          if (media.metadata?.folderId !== folderId) return media;
          const nextMetadata = { ...(media.metadata || {}) };
          delete nextMetadata.folderId;
          return { ...media, metadata: nextMetadata };
        });
      });
      setFolders(nextFolders);
      if (folderFilter === folderId) setFolderFilter("all");
      refreshMediaList();
    },
    [actions, folderFilter, folders, refreshMediaList]
  );

  const moveMediaToFolder = useCallback(
    (mediaIds: string[], folderId: string | null) => {
      if (!mediaIds.length) return;
      const idSet = new Set(mediaIds);
      actions.setProp(ROOT_NODE, (props: Record<string, any>) => {
        if (!Array.isArray(props.pageMedia)) return;
        props.pageMedia = props.pageMedia.map((media: MediaItem) => {
          if (!idSet.has(media.id)) return media;
          const nextMetadata = { ...(media.metadata || {}) };
          if (folderId) nextMetadata.folderId = folderId;
          else delete nextMetadata.folderId;
          return { ...media, metadata: nextMetadata };
        });
      });
      refreshMediaList();
    },
    [actions, refreshMediaList]
  );

  const moveSelectedToFolder = useCallback(
    (folderId: string | null) => {
      moveMediaToFolder(selectedMediaIds, folderId);
    },
    [moveMediaToFolder, selectedMediaIds]
  );

  const handleSearch = (q: string) => {
    setSearchQuery(q);
  };

  const handleKindFilterChange = (next: MediaKind | "all") => {
    setKindFilter(next);
  };

  const handleDelete = (mediaId: string) => {
    setDeleteConfirm({ isOpen: true, mediaIds: [mediaId] });
  };

  const handleDeleteSelected = () => {
    if (!selectedMediaIds.length) return;
    setDeleteConfirm({ isOpen: true, mediaIds: selectedMediaIds });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.mediaIds.length) return;
    const mediaIdsToDelete = deleteConfirm.mediaIds;

    setDeleteConfirm({ isOpen: false, mediaIds: [] });
    setDeletingMedia(prev => Array.from(new Set([...prev, ...mediaIdsToDelete])));

    for (const mediaIdToDelete of mediaIdsToDelete) {
      try {
        await DeleteMedia(mediaIdToDelete, settings, query, actions);
      } catch (error) {
        console.error("Failed to delete media:", error);
      }
    }

    actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
      const pageMedia = props.pageMedia as MediaItem[] | undefined;
      if (!pageMedia) return;
      const deleteSet = new Set(mediaIdsToDelete);
      props.pageMedia = pageMedia.filter(m => !deleteSet.has(m.id));
    });

    refreshMediaList();
    clearSelection();
    setDeletingMedia(prev => prev.filter(id => !mediaIdsToDelete.includes(id)));
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

  const openEditModal = (media: MediaItem) => {
    setEditingMedia({
      ...media,
      metadata: {
        alt: media.metadata?.alt || "",
        title: media.metadata?.title || "",
        description: media.metadata?.description || "",
        url: media.metadata?.url || "",
        svg: media.metadata?.svg || "",
        folderId: media.metadata?.folderId,
      },
    });
    setSavingMetadata("idle");
    ai.setMetadataError("");
  };

  const closeEditModal = () => {
    setEditingMedia(null);
    setSavingMetadata("idle");
    ai.setMetadataError("");
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

  const applyGeneratedMetadata = (metadata: PageHubMediaMetadataSuggestion) => {
    if (!editingMedia) return;
    setEditingMedia({
      ...editingMedia,
      metadata: {
        ...editingMedia.metadata,
        ...metadata,
      },
    });
  };

  const analysisImageUrl = useMemo(() => {
    if (!editingMedia || editingMedia.type === "svg") return undefined;
    if (editingMedia.type === "url") return editingMedia.metadata?.url || undefined;
    return getCdnUrl(editingMedia.cdnId || editingMedia.id, { width: 800, format: "auto" });
  }, [editingMedia]);

  const mediaEditAiActionsContext: PageHubMediaEditAiActionsContext | null = editingMedia
    ? {
        media: {
          id: editingMedia.id,
          type: editingMedia.type,
          cdnId: editingMedia.cdnId,
          metadata: editingMedia.metadata,
        },
        imageUrl: analysisImageUrl,
        isGenerating: ai.isGeneratingMetadata,
        error: ai.metadataError,
        designNotes: designContext.designNotes,
        designTags: designContext.designTags,
        setGenerating: ai.setIsGeneratingMetadata,
        setError: ai.setMetadataError,
        applyMetadata: applyGeneratedMetadata,
      }
    : null;

  useEffect(() => {
    if (!assistantMediaMetadataResult || !editingMedia) return;
    if (assistantMediaMetadataResult.mediaId !== editingMedia.id) return;
    applyGeneratedMetadata({
      title: assistantMediaMetadataResult.title,
      alt: assistantMediaMetadataResult.alt,
      description: assistantMediaMetadataResult.description,
    });
    ai.setMetadataError("");
    setAssistantMediaMetadataResult(null);
  }, [
    assistantMediaMetadataResult,
    editingMedia,
    applyGeneratedMetadata,
    ai,
    setAssistantMediaMetadataResult,
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      phStorage.set("media-view", viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    if (isOpen) {
      refreshMediaList();
      setSearchQuery("");
      clearSelection();
      setEditingMedia(null);
      setFolderFilter("all");
    }
  }, [clearSelection, isOpen, refreshMediaList]);

  useEffect(() => {
    setFilteredMedia(applyFilters(mediaList));
  }, [applyFilters, mediaList]);

  useEffect(() => {
    setSelectedMediaIds(prev => prev.filter(id => mediaList.some(media => media.id === id)));
    setSelectedMedia(prev => (prev && mediaList.some(media => media.id === prev) ? prev : null));
  }, [mediaList]);

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

  useEffect(() => {
    if (!isOpen || previewMedia || editingMedia) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const hasSelection = selectedMediaIds.length > 0;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        if (!selectionMode) {
          e.preventDefault();
          selectAllVisible();
        }
        return;
      }

      if (e.key === "Escape") {
        if (hasSelection) {
          e.preventDefault();
          clearSelection();
        }
        return;
      }

      if (e.key === "Enter" && selectedMedia) {
        e.preventDefault();
        if (selectionMode && onSelect) {
          onSelect(selectedMedia);
          onClose();
        } else {
          setPreviewMedia(selectedMedia);
        }
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && hasSelection && !selectionMode) {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }

      if (
        e.key !== "ArrowLeft" &&
        e.key !== "ArrowRight" &&
        e.key !== "ArrowUp" &&
        e.key !== "ArrowDown"
      ) {
        return;
      }

      if (!filteredMedia.length) return;
      e.preventDefault();

      const currentId = selectedMedia || filteredMedia[0].id;
      const currentIndex = Math.max(
        0,
        filteredMedia.findIndex(item => item.id === currentId)
      );

      const step = viewMode === "cards" ? 5 : 1;
      let nextIndex = currentIndex;

      if (e.key === "ArrowLeft") nextIndex = Math.max(0, currentIndex - 1);
      if (e.key === "ArrowRight") nextIndex = Math.min(filteredMedia.length - 1, currentIndex + 1);
      if (e.key === "ArrowUp") nextIndex = Math.max(0, currentIndex - step);
      if (e.key === "ArrowDown") nextIndex = Math.min(filteredMedia.length - 1, currentIndex + step);

      const nextId = filteredMedia[nextIndex]?.id;
      if (!nextId) return;
      selectSingle(nextId);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    clearSelection,
    editingMedia,
    filteredMedia,
    isOpen,
    onClose,
    onSelect,
    previewMedia,
    selectAllVisible,
    selectSingle,
    selectedMedia,
    selectedMediaIds.length,
    selectionMode,
    viewMode,
  ]);

  const canEditSelected = selectedMediaIds.length === 1;

  return {
    mediaList,
    filteredMedia,
    folders,
    folderNameById,
    folderCounts,
    folderFilter,
    searchQuery,
    selectedMedia,
    selectedMediaIds,
    editingMedia,
    cropMedia,
    viewMode,
    sortField,
    sortDirection,
    kindFilter,
    previewMedia,
    deleteConfirm,
    deletingMedia,
    savingMetadata,

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
    renderMediaEditAiActions: mediaEditAiActionsSlot,
    mediaEditAiActionsContext,

    setSearchQuery,
    setSelectedMedia,
    setViewMode,
    setSortField,
    setSortDirection,
    setKindFilter: handleKindFilterChange,
    setFolderFilter,
    setPreviewMedia,
    setCropMedia,
    setEditingMedia,
    setAddMode: upload.setAddMode,
    setUrlInput: upload.setUrlInput,
    setSvgInput: upload.setSvgInput,
    setSaveUrlToCdn: upload.setSaveUrlToCdn,
    setUploadError: upload.setUploadError,
    setReplacingMedia: upload.setReplacingMedia,
    setDeleteConfirm,

    handleSearch,
    handleDelete,
    handleDeleteSelected,
    confirmDelete,
    handlePreviewNext,
    handlePreviewPrevious,
    handleReorder,
    handleSaveCroppedImage,
    handleMediaSelection,
    clearSelection,
    selectAllVisible,
    openEditModal,
    closeEditModal,
    saveEditedMetadata,
    handleUpload: upload.handleUpload,
    handleReplaceMedia: upload.handleReplaceMedia,
    handleAddUrl: upload.handleAddUrl,
    handleAddSvg: upload.handleAddSvg,
    handlePasteClick: upload.handlePasteClick,

    createFolder,
    renameFolder,
    deleteFolder,
    moveMediaToFolder,
    moveSelectedToFolder,

    selectionMode,
    onSelect,
    onClose,
    settings,
    resortFilteredMedia: (override?: { sortField?: SortField; sortDirection?: SortDirection }) =>
      setFilteredMedia(
        applyFilters(mediaList, {
          sortField: override?.sortField,
          sortDirection: override?.sortDirection,
        })
      ),
  };
}

export type UseMediaManagerReturn = ReturnType<typeof useMediaManager>;
