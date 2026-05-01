import type { MediaFolder } from "../utils/media-helpers";

export interface UseMediaManagerOptions {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (mediaId: string) => void;
  selectionMode: boolean;
}

export type FolderFilter = "all" | "unfiled" | string;

export type SelectionModifiers = {
  shiftKey?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
};

export function normalizeFolders(input: unknown): MediaFolder[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item: any, index: number) => {
      const name = typeof item?.name === "string" ? item.name.trim() : "";
      const id = typeof item?.id === "string" ? item.id : "";
      if (!name || !id) return null;
      const now = Date.now();
      return {
        id,
        name,
        order: Number.isFinite(item?.order) ? Number(item.order) : index,
        createdAt: Number.isFinite(item?.createdAt) ? Number(item.createdAt) : now,
        updatedAt: Number.isFinite(item?.updatedAt) ? Number(item.updatedAt) : now,
      } as MediaFolder;
    })
    .filter((item): item is MediaFolder => !!item)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}
