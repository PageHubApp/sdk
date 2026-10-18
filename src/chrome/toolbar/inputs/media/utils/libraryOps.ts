/**
 * Pure list transforms behind the Craft-tree media library
 * (`useRootPropsMediaLibrary`). No React, no Craft — each takes the current
 * `pageMedia` array and returns the next one, so they're unit-testable.
 */
import type { MediaItem } from "../../../../../utils/media/libraryTypes";
import type { MediaItemPatch } from "../../../../../utils/media/libraryStore";

const list = (input: unknown): MediaItem[] => (Array.isArray(input) ? input : []);

/** Append new entries; an id already in the library is replaced in place. */
export function addLibraryItems(current: unknown, items: MediaItem[]): MediaItem[] {
  const next = [...list(current)];
  const now = Date.now();
  for (const item of items) {
    const entry = { uploadedAt: now, ...item };
    const at = next.findIndex(m => m.id === item.id);
    if (at === -1) next.push(entry);
    else next[at] = entry;
  }
  return next;
}

/** Patch one entry; `metadata` merges and `name` maps to `metadata.title`.
 *  Returns `null` when the id isn't in the library. */
export function patchLibraryItem(
  current: unknown,
  id: string,
  patch: MediaItemPatch
): { items: MediaItem[]; item: MediaItem } | null {
  const items = list(current);
  const at = items.findIndex(m => m.id === id);
  if (at === -1) return null;
  const { name, metadata, ...rest } = patch;
  const prev = items[at];
  const nextMetadata = {
    ...prev.metadata,
    ...metadata,
    ...(name !== undefined ? { title: name } : {}),
  };
  const item: MediaItem = { ...prev, ...rest, metadata: nextMetadata };
  const next = [...items];
  next[at] = item;
  return { items: next, item };
}

export function reorderLibraryItems(
  current: unknown,
  order: Array<{ id: string; order: number }>
): MediaItem[] {
  const byId = new Map(order.map(o => [o.id, o.order]));
  return list(current).map(m => (byId.has(m.id) ? { ...m, order: byId.get(m.id) } : m));
}

/** File `ids` into `folderId`, or unfile them with `null`. */
export function moveLibraryItems(
  current: unknown,
  ids: string[],
  folderId: string | null
): MediaItem[] {
  const idSet = new Set(ids);
  return list(current).map(m => {
    if (!idSet.has(m.id)) return m;
    const metadata = { ...m.metadata };
    if (folderId) metadata.folderId = folderId;
    else delete metadata.folderId;
    return { ...m, metadata };
  });
}

export function removeLibraryItems(current: unknown, ids: string[]): MediaItem[] {
  const idSet = new Set(ids);
  return list(current).filter(m => !idSet.has(m.id));
}
