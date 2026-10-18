import { useState } from "react";
import type { MediaLibrary, MediaRemoveResult } from "@/utils/media/libraryStore";
import { sdkLog } from "../../../../../utils/logger";

interface UseMediaDeleteStateArgs {
  library: MediaLibrary;
  selectedMediaIds: string[];
  clearSelection: () => void;
}

const keptReason = (reason: string | undefined, it: string): string | null => {
  if (reason === "used-by-other-site") return `another site still uses ${it}`;
  if (reason === "uploader-not-on-site") return `${it === "it" ? "its" : "their"} uploader isn't on this site`;
  return null;
};

/**
 * What the user should know after a delete, or `null` when every file was
 * simply deleted. Removed entries are always gone from this library; this only
 * explains files whose bytes were kept and backups that referenced them.
 */
export function describeRemoveResults(results: MediaRemoveResult[]): string | null {
  const lines: string[] = [];
  const kept = results.filter(r => !r.deleted);
  if (kept.length) {
    const it = kept.length === 1 ? "it" : "them";
    const reasons = Array.from(new Set(kept.map(r => keptReason(r.reason, it)).filter(Boolean)));
    const files = kept.length === 1 ? "1 file stays" : `${kept.length} files stay`;
    const why = reasons.length ? ` because ${reasons.join(", or ")}` : "";
    lines.push(`Removed from this library. ${files} in storage${why}.`);
  }
  const backups = Math.max(0, ...results.map(r => r.backupsUsingMedia ?? 0));
  if (backups > 0) {
    const what = results.length === 1 ? "this file" : "these files";
    const it = results.length === 1 ? "it" : "them";
    const used = backups === 1 ? "1 backup uses" : `${backups} backups use`;
    const restore = backups === 1 ? "it" : "one of them";
    lines.push(`${used} ${what}. Restoring ${restore} won't bring ${it} back.`);
  }
  return lines.length ? lines.join("\n") : null;
}

export function useMediaDeleteState({
  library,
  selectedMediaIds,
  clearSelection,
}: UseMediaDeleteStateArgs) {
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    mediaIds: string[];
  }>({ isOpen: false, mediaIds: [] });
  const [deletingMedia, setDeletingMedia] = useState<string[]>([]);
  /** Shown in the Media Manager after a delete that kept files or touched backups. */
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

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
    setDeleteNotice(null);
    setDeletingMedia(prev => Array.from(new Set([...prev, ...mediaIdsToDelete])));

    try {
      setDeleteNotice(describeRemoveResults(await library.remove(mediaIdsToDelete)));
    } catch (error) {
      sdkLog.error("Failed to delete media:", error);
      setDeleteNotice("Couldn't delete that media. Check your connection and try again.");
    }

    clearSelection();
    setDeletingMedia(prev => prev.filter(id => !mediaIdsToDelete.includes(id)));
  };

  return {
    deleteConfirm,
    setDeleteConfirm,
    deletingMedia,
    deleteNotice,
    setDeleteNotice,
    handleDelete,
    handleDeleteSelected,
    confirmDelete,
  };
}
