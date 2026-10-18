/**
 * Craft-tree media library — the `MediaLibraryStore` used when no host store
 * is registered (SDK consumers with no backend: avocado-editor, demos).
 *
 * The library lives on `ROOT.props.pageMedia` / `ROOT.props.mediaFolders` and
 * every write is a `setProp(ROOT_NODE)`. This file is the ONLY place in the
 * SDK that writes those two props for the Media Manager; with a host store
 * registered they're written by `useMirrorMediaLibraryToRoot` instead.
 */
import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { useMemo } from "react";
import { DeleteMedia } from "../../../../viewport/state/api";
import { SettingsAtom } from "../../../../../utils/atoms";
import type {
  MediaLibrary,
  MediaLibraryStore,
  MediaRemoveResult,
} from "../../../../../utils/media/libraryStore";
import type { MediaItem } from "../../../../../utils/media/libraryTypes";
import {
  addLibraryItems,
  moveLibraryItems,
  patchLibraryItem,
  removeLibraryItems,
  reorderLibraryItems,
} from "../utils/libraryOps";
import { normalizeFolders } from "./types";

type RootProps = Record<string, any>;

interface RootPropsLibraryDeps {
  query: any;
  actions: any;
  /** Site id sent to `DELETE /api/files` with each removed file. */
  siteId?: string;
}

/** Delete one file's bytes; the entry is dropped from the tree either way. */
async function deleteMediaBytes(mediaId: string, siteId?: string): Promise<MediaRemoveResult> {
  try {
    const body = await DeleteMedia(mediaId, { _id: siteId });
    return {
      id: mediaId,
      deleted: body?.deleted === true,
      reason: typeof body?.reason === "string" ? body.reason : undefined,
      backupsUsingMedia:
        typeof body?.backupsUsingMedia === "number" ? body.backupsUsingMedia : undefined,
    };
  } catch {
    return { id: mediaId, deleted: false };
  }
}

/**
 * The tree store's operations, without the React hook. Non-hook callers that
 * already hold Craft's `query` / `actions` (e.g. node delete in `nodeOps`) use
 * this directly.
 */
export function createRootPropsMediaLibrary({
  query,
  actions,
  siteId,
}: RootPropsLibraryDeps): Omit<MediaLibraryStore, "useSnapshot"> {
  const readRoot = (): RootProps => query.node(ROOT_NODE).get()?.data?.props ?? {};
  const write = (fn: (props: RootProps) => void) => actions.setProp(ROOT_NODE, fn);

  return {
    refresh: async () => {},
    add: async (items: MediaItem[]) => {
      write(p => {
        p.pageMedia = addLibraryItems(p.pageMedia, items);
      });
      return items;
    },
    update: async (id, patch) => {
      const result = patchLibraryItem(readRoot().pageMedia, id, patch);
      if (!result) throw new Error(`Media ${id} is not in the library`);
      write(p => {
        p.pageMedia = patchLibraryItem(p.pageMedia, id, patch)?.items ?? p.pageMedia;
      });
      return result.item;
    },
    reorder: async order => {
      write(p => {
        p.pageMedia = reorderLibraryItems(p.pageMedia, order);
      });
    },
    move: async (ids, folderId) => {
      if (!ids.length) return;
      write(p => {
        p.pageMedia = moveLibraryItems(p.pageMedia, ids, folderId);
      });
    },
    remove: async ids => {
      const results: MediaRemoveResult[] = [];
      for (const id of ids) results.push(await deleteMediaBytes(id, siteId));
      write(p => {
        p.pageMedia = removeLibraryItems(p.pageMedia, ids);
      });
      return results;
    },
    saveFolders: async folders => {
      write(p => {
        p.mediaFolders = folders;
      });
      return folders;
    },
  };
}

export function useRootPropsMediaLibrary(): MediaLibrary {
  const { query, actions, pageMedia, mediaFolders } = useEditor(state => {
    const props = state.nodes[ROOT_NODE]?.data?.props as RootProps | undefined;
    return { pageMedia: props?.pageMedia, mediaFolders: props?.mediaFolders };
  });
  const settings = useAtomValue(SettingsAtom) as { _id?: string } | null;
  const siteId = settings?._id;

  const ops = useMemo(
    () => createRootPropsMediaLibrary({ query, actions, siteId }),
    [query, actions, siteId]
  );

  return useMemo(() => {
    const snapshot = {
      items: Array.isArray(pageMedia) ? (pageMedia as MediaItem[]) : [],
      folders: normalizeFolders(mediaFolders),
    };
    return {
      ...ops,
      useSnapshot: () => ({ data: snapshot, error: undefined }),
      snapshot,
      loaded: true,
    };
  }, [ops, pageMedia, mediaFolders]);
}
