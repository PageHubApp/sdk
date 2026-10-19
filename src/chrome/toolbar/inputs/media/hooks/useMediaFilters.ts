import { useCallback, useEffect, useState } from "react";
import {
  getMediaKind,
  MEDIA_KIND_LABELS,
  sortMedia,
  type SortDirection,
  type SortField,
} from "../utils/media-helpers";
import type { MediaLibrary } from "@/utils/media/libraryStore";
import type { MediaItem, MediaKind } from "@/utils/media/libraryTypes";
import { sdkLog } from "../../../../../utils/logger";
import type { FolderFilter } from "./types";

interface UseMediaFiltersArgs {
  reorder: MediaLibrary["reorder"];
  mediaList: MediaItem[];
  folderNameById: Map<string, string>;
  validFolderIdSet: Set<string>;
  searchQuery: string;
  kindFilter: MediaKind | "all";
  folderFilter: FolderFilter;
  sortField: SortField;
  sortDirection: SortDirection;
}

/**
 * Owns `filteredMedia` state + the `applyFilters` transform.
 * Filter order matters: kind → folder → search → sort.
 */
export function useMediaFilters({
  reorder,
  mediaList,
  folderNameById,
  validFolderIdSet,
  searchQuery,
  kindFilter,
  folderFilter,
  sortField,
  sortDirection,
}: UseMediaFiltersArgs) {
  const [filteredMedia, setFilteredMedia] = useState<MediaItem[]>([]);

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
            ? folderNameById.get(m.metadata.folderId) || ""
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
    [
      folderFilter,
      folderNameById,
      kindFilter,
      searchQuery,
      sortDirection,
      sortField,
      validFolderIdSet,
    ]
  );

  useEffect(() => {
    setFilteredMedia(applyFilters(mediaList));
  }, [applyFilters, mediaList]);

  const handleReorder = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const draggedIndex = filteredMedia.findIndex(m => m.id === draggedId);
    const targetIndex = filteredMedia.findIndex(m => m.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...filteredMedia];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    const updatedMedia = newOrder.map((media, index) => ({ ...media, order: index }));

    reorder(updatedMedia.map(({ id }, order) => ({ id, order }))).catch(e =>
      sdkLog.error("Failed to reorder media:", e)
    );

    setFilteredMedia(updatedMedia);
  };

  const resortFilteredMedia = (override?: {
    sortField?: SortField;
    sortDirection?: SortDirection;
  }) =>
    setFilteredMedia(
      applyFilters(mediaList, {
        sortField: override?.sortField,
        sortDirection: override?.sortDirection,
      })
    );

  return {
    filteredMedia,
    setFilteredMedia,
    applyFilters,
    handleReorder,
    resortFilteredMedia,
  };
}
