import { useCallback, useRef, useState } from "react";
import type { MediaItem } from "../utils/media-helpers";
import type { SelectionModifiers } from "./types";

export function useMediaSelectionState(filteredMedia: MediaItem[], selectionMode: boolean) {
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const lastSelectedMediaIdRef = useRef<string | null>(null);

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

  return {
    selectedMedia,
    setSelectedMedia,
    selectedMediaIds,
    setSelectedMediaIds,
    lastSelectedMediaIdRef,
    clearSelection,
    selectSingle,
    handleMediaSelection,
    selectAllVisible,
  };
}
