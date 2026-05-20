import useSWR from "swr";
import { getBlocksProvider } from "../define/blocksProvider";
import type { BlockItem } from "../define/blocksProvider";

// Re-export for backwards-compat with existing imports.
export type { BlockItem };

/**
 * Fetches blocks for a specific category (with full structure) on demand.
 * Pass `null` as category to skip fetching.
 */
export function useCategoryBlocks(
  category: string | null,
  subcategory?: string | null,
  style?: string | null
) {
  // SWR key uses delimiters that won't collide with category/subcategory/style strings.
  const key = category
    ? `pagehub:blocks:category|${category}|${subcategory ?? ""}|${style ?? ""}`
    : null;

  const { data, isLoading } = useSWR<BlockItem[]>(
    key,
    () =>
      getBlocksProvider().listBlocks({
        category: category!,
        subcategory: subcategory || undefined,
        style: style || undefined,
        limit: 100,
        sort: "name",
        includeStructure: true,
      }),
    { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 120000 }
  );

  return { blocks: data || [], isLoading };
}

/**
 * Search blocks across all categories by query string.
 * Returns blocks with structure for preview.
 */
export function useBlockSearch(query: string | null, style?: string | null) {
  const trimmed = query?.trim() ?? "";
  const key = trimmed.length >= 2 ? `pagehub:blocks:search|${trimmed}|${style ?? ""}` : null;

  const { data, isLoading } = useSWR<BlockItem[]>(
    key,
    () =>
      getBlocksProvider().listBlocks({
        search: trimmed,
        style: style || undefined,
        limit: 30,
        sort: "name",
        includeStructure: true,
      }),
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  return { blocks: data || [], isLoading };
}
