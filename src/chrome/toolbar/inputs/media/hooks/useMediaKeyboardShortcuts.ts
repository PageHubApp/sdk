import { useEffect } from "react";
import type { MediaItem } from "../utils/media-helpers";

interface UseMediaKeyboardShortcutsArgs {
  isOpen: boolean;
  selectionMode: boolean;
  onSelect?: (mediaId: string) => void;
  onClose: () => void;
  filteredMedia: MediaItem[];
  selectedMedia: string | null;
  selectedMediaIds: string[];
  previewMedia: string | null;
  editingMedia: MediaItem | null;
  viewMode: "cards" | "list";
  selectAllVisible: () => void;
  clearSelection: () => void;
  selectSingle: (id: string | null) => void;
  setPreviewMedia: (id: string | null) => void;
  handleDeleteSelected: () => void;
}

export function useMediaKeyboardShortcuts({
  isOpen,
  selectionMode,
  onSelect,
  onClose,
  filteredMedia,
  selectedMedia,
  selectedMediaIds,
  previewMedia,
  editingMedia,
  viewMode,
  selectAllVisible,
  clearSelection,
  selectSingle,
  setPreviewMedia,
  handleDeleteSelected,
}: UseMediaKeyboardShortcutsArgs) {
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
      if (e.key === "ArrowDown")
        nextIndex = Math.min(filteredMedia.length - 1, currentIndex + step);

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
    setPreviewMedia,
    handleDeleteSelected,
  ]);
}
