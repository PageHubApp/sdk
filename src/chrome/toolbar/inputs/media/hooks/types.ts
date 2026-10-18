import type { MediaFolder } from "@/utils/media/libraryTypes";

/** Site design notes / tags the AI metadata actions read. */
export interface MediaDesignContext {
  notes?: string;
  tags?: string[];
}

export interface UseMediaManagerOptions {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (mediaId: string) => void;
  selectionMode: boolean;
  /** Editor shells pass `useEditorDesignContext()`; a host outside the editor
   *  passes its own site data. */
  designContext?: MediaDesignContext;
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
