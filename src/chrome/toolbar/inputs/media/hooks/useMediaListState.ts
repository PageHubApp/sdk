import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { useCallback, useMemo, useState } from "react";
import { getPageMedia } from "@/utils/media/media";
import type { MediaFolder, MediaItem } from "../utils/media-helpers";
import { normalizeFolders } from "./types";

export function useMediaListState() {
  const { query, actions } = useEditor();
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<MediaFolder[]>([]);

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

  const refreshMediaList = useCallback(() => {
    const media = getPageMedia(query);
    const rootNode = query.node(ROOT_NODE).get();
    const rootProps = rootNode?.data?.props as Record<string, unknown> | undefined;
    const nextFolders = normalizeFolders(rootProps?.mediaFolders);
    setMediaList(media);
    setFolders(nextFolders);
  }, [query]);

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

  const deleteFolderById = useCallback(
    (folderId: string, onDeleted?: () => void) => {
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
      onDeleted?.();
      refreshMediaList();
    },
    [actions, folders, refreshMediaList]
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

  return {
    query,
    actions,
    mediaList,
    setMediaList,
    folders,
    setFolders,
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
