import { useEffect } from "react";
import type { MediaItem } from "../utils/media-helpers";
import { isInsideTextEditingSurface } from "../../../../../utils/keyboard";

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
  clearSelection: () => void;
  selectSingle: (id: string | null) => void;
  setPreviewMedia: (id: string | null) => void;
}

/**
 * Modal-local keyboard handlers. ⌘A (select all) and Backspace/Delete are
 * owned by the registry (`ph.media.selectAll` / `ph.media.deleteSelected`).
 * This hook
 * keeps Escape (clear selection), Enter (pick/preview), and arrow-key
 * navigation inline because they are media-grid-specific and a11y plumbing
 * (per command-registry audit doc 4 § Arrow-key navigation).
 */
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
  clearSelection,
  selectSingle,
  setPreviewMedia,
}: UseMediaKeyboardShortcutsArgs) {
  useEffect(() => {
    if (!isOpen || previewMedia || editingMedia) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (isInsideTextEditingSurface(e.target)) return;

      const hasSelection = selectedMediaIds.length > 0;

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
    selectSingle,
    selectedMedia,
    selectedMediaIds.length,
    selectionMode,
    viewMode,
    setPreviewMedia,
  ]);
}
