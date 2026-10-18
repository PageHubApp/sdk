/**
 * Media library store — host-injectable seam for the site's media library.
 *
 * The Media Manager never touches `ROOT.props.pageMedia` itself. It reads and
 * writes through a `MediaLibraryStore`:
 *  - a host that keeps the library somewhere else (PageHub: one row per file)
 *    registers its store on boot;
 *  - with no host store, `useMediaLibrary()` falls back to the Craft tree
 *    (`useRootPropsMediaLibrary`), which is today's `setProp(ROOT_NODE)`
 *    behaviour for SDK consumers with no backend (avocado-editor, demos).
 *
 * In the editor, `useMirrorMediaLibraryToRoot` copies the host store's
 * snapshot into `ROOT.props.pageMedia` / `mediaFolders` so every renderer and
 * picker that reads the tree keeps working.
 *
 * Mirrors `registerMediaUploadHandler` in `./registry`.
 */
import { useMemo, useState } from "react";
import { useRootPropsMediaLibrary } from "../../chrome/toolbar/inputs/media/hooks/useRootPropsMediaLibrary";
import type { MediaFolder, MediaItem } from "./libraryTypes";

export interface MediaLibrarySnapshot {
  items: MediaItem[];
  folders: MediaFolder[];
}

export interface MediaRemoveResult {
  id: string;
  /** Bytes deleted. The library entry is always removed. */
  deleted: boolean;
  /** Why the bytes were kept: "uploader-not-on-site" | "used-by-other-site" | … */
  reason?: string;
  /** Backups that reference this file (they restore without it). */
  backupsUsingMedia?: number;
}

export type MediaItemPatch = Partial<Pick<MediaItem, "type" | "cdnId" | "order" | "metadata">> & {
  name?: string;
};

export interface MediaLibraryStore {
  /** React hook. Host implements with SWR. Must be called unconditionally. */
  useSnapshot(): { data: MediaLibrarySnapshot | undefined; error: unknown };
  /** Revalidate after an upload the server already registered (site-scoped confirm). */
  refresh(): Promise<void>;
  /** Register entries with no upload behind them (url, svg, crop result, AI result). */
  add(items: MediaItem[]): Promise<MediaItem[]>;
  /** Patch one entry. `metadata` merges into the stored metadata. Rejects when `id` isn't in the library. */
  update(id: string, patch: MediaItemPatch): Promise<MediaItem>;
  reorder(order: Array<{ id: string; order: number }>): Promise<void>;
  move(ids: string[], folderId: string | null): Promise<void>;
  remove(ids: string[]): Promise<MediaRemoveResult[]>;
  saveFolders(folders: MediaFolder[]): Promise<MediaFolder[]>;
}

/** What `useMediaLibrary()` returns: the store's operations plus its current snapshot. */
export type MediaLibrary = MediaLibraryStore & {
  snapshot: MediaLibrarySnapshot;
  /** False until the store's first snapshot arrives (always true for the tree fallback). */
  loaded: boolean;
};

let _store: MediaLibraryStore | null = null;

/**
 * Register (or clear, with `null`) the host's library store.
 *
 * Register BEFORE any media chrome first renders (Media Manager, pickers, the
 * editor itself): each component picks the registered store or the Craft-tree
 * fallback once, on mount, and keeps that choice for its lifetime. Swapping
 * stores later only reaches components mounted after the swap.
 */
export function registerMediaLibraryStore(store: MediaLibraryStore | null): void {
  _store = store;
}

export function getMediaLibraryStore(): MediaLibraryStore | null {
  return _store;
}

const EMPTY_SNAPSHOT: MediaLibrarySnapshot = { items: [], folders: [] };

function useRegisteredMediaLibrary(store: MediaLibraryStore): MediaLibrary {
  const { data } = store.useSnapshot();
  return useMemo<MediaLibrary>(
    () => ({
      useSnapshot: store.useSnapshot,
      refresh: () => store.refresh(),
      add: items => store.add(items),
      update: (id, patch) => store.update(id, patch),
      reorder: order => store.reorder(order),
      move: (ids, folderId) => store.move(ids, folderId),
      remove: ids => store.remove(ids),
      saveFolders: folders => store.saveFolders(folders),
      snapshot: data ?? EMPTY_SNAPSHOT,
      loaded: data !== undefined,
    }),
    [store, data]
  );
}

/**
 * The one hook the Media Manager reads. The registered store, else the
 * Craft-tree store. With a registered store nothing here calls Craft, so it
 * works outside `<Editor>` (the dashboard Media page).
 */
export function useMediaLibrary(): MediaLibrary {
  // Read once per mount so the hook sequence below can't change mid-life.
  const [store] = useState(getMediaLibraryStore);
  // eslint-disable-next-line react-hooks/rules-of-hooks -- `store` is fixed for this mount
  return store ? useRegisteredMediaLibrary(store) : useRootPropsMediaLibrary();
}
