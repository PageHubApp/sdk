/**
 * Media library store — host-injectable seam for the site's media library.
 *
 * The media library UI reads and writes through a `MediaLibraryStore` the host
 * (PageHub: one row per file) registers on boot.
 *
 * Mirrors `registerMediaUploadHandler` in `./registry`.
 */
import { useMemo, useState } from "react";
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
 * Register BEFORE any media UI first renders: each component picks the
 * registered store once, on mount, and keeps it for its lifetime. Swapping
 * stores later only reaches components mounted after the swap.
 */
export function registerMediaLibraryStore(store: MediaLibraryStore | null): void {
  _store = store;
}

export function getMediaLibraryStore(): MediaLibraryStore | null {
  return _store;
}

const EMPTY_SNAPSHOT: MediaLibrarySnapshot = { items: [], folders: [] };

/**
 * The one hook the media library UI reads: the registered store's operations
 * plus its current snapshot. The store is read once per mount.
 */
export function useMediaLibrary(): MediaLibrary {
  const [store] = useState(getMediaLibraryStore);
  if (!store) throw new Error("[PageHub] useMediaLibrary: no media library store registered");
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
