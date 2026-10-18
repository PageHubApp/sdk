import { useCallback, useMemo, useRef } from "react";
import type { MediaLibrary } from "@/utils/media/libraryStore";
import type { MediaFolder } from "@/utils/media/libraryTypes";
import { sdkLog } from "../../../../../utils/logger";
import { normalizeFolders } from "./types";

const logFailure = (what: string) => (e: unknown) => sdkLog.error(`Failed to ${what}:`, e);

/** The library list + folders, read from the media library store. */
export function useMediaListState(library: MediaLibrary) {
  const mediaList = library.snapshot.items;
  const folders = useMemo(
    () => normalizeFolders(library.snapshot.folders),
    [library.snapshot.folders]
  );

  const folderNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const folder of folders) map.set(folder.id, folder.name);
    return map;
  }, [folders]);

  const validFolderIdSet = useMemo(() => new Set(folders.map(folder => folder.id)), [folders]);

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

  // Stable identity: the open-reset effect in `useMediaManager` depends on it,
  // and `library` is a new object whenever the snapshot changes.
  const libraryRef = useRef(library);
  libraryRef.current = library;
  const refreshMediaList = useCallback(() => {
    libraryRef.current.refresh().catch(logFailure("refresh the media library"));
  }, []);

  const persistFolders = useCallback(
    (nextFolders: MediaFolder[]) => {
      library.saveFolders(nextFolders).catch(logFailure("save media folders"));
    },
    [library]
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

  /** Unfile the folder's items, then drop the folder. */
  const deleteFolderById = useCallback(
    async (folderId: string, onDeleted?: () => void) => {
      const filed = mediaList.filter(m => m.metadata?.folderId === folderId).map(m => m.id);
      try {
        if (filed.length) await library.move(filed, null);
        await library.saveFolders(folders.filter(folder => folder.id !== folderId));
        onDeleted?.();
      } catch (e) {
        logFailure("delete the media folder")(e);
      }
    },
    [library, mediaList, folders]
  );

  const moveMediaToFolder = useCallback(
    (mediaIds: string[], folderId: string | null) => {
      if (!mediaIds.length) return;
      library.move(mediaIds, folderId).catch(logFailure("move media"));
    },
    [library]
  );

  return {
    mediaList,
    folders,
    folderNameById,
    validFolderIdSet,
    folderCounts,
    refreshMediaList,
    createFolder,
    renameFolder,
    deleteFolderById,
    moveMediaToFolder,
  };
}
