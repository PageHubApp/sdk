import useSWR from "swr";
import { getBlocksProvider } from "../define/blocksProvider";
import type { BlockCategory, BlockSubcategory } from "../define/blocksProvider";

// Re-export for backwards-compat with existing imports.
export type { BlockCategory, BlockSubcategory };

/**
 * Lightweight hook that fetches category metadata (names, counts, subcategories).
 * Goes through the registered BlocksProvider (HTTP by default — see
 * `registerBlocksProvider`).
 */
export function useBlockCategories() {
  const { data, isLoading } = useSWR<BlockCategory[]>(
    "pagehub:blocks:categories",
    () => getBlocksProvider().listCategories(),
    { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 120000 }
  );

  return { categories: data || [], isLoading };
}
