import { ROOT_NODE } from "@craftjs/utils";
import { useState } from "react";
import { DeleteMedia } from "@/chrome/viewport/state/viewportExports";
import type { MediaItem } from "../utils/media-helpers";

interface UseMediaDeleteStateArgs {
  query: any;
  actions: any;
  settings: any;
  selectedMediaIds: string[];
  refreshMediaList: () => void;
  clearSelection: () => void;
}

export function useMediaDeleteState({
  query,
  actions,
  settings,
  selectedMediaIds,
  refreshMediaList,
  clearSelection,
}: UseMediaDeleteStateArgs) {
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    mediaIds: string[];
  }>({ isOpen: false, mediaIds: [] });
  const [deletingMedia, setDeletingMedia] = useState<string[]>([]);

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

  return {
    deleteConfirm,
    setDeleteConfirm,
    deletingMedia,
    handleDelete,
    handleDeleteSelected,
    confirmDelete,
  };
}
