import useSWR from "swr";

export interface BlockItem {
  _id: string;
  slug: string;
  name: string;
  category: string;
  subcategory?: string;
  style?: string;
  description?: string;
  structure: any;
  modifiers?: Record<string, { name: string; classes: string }[]>;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Fetches blocks for a specific category (with full structure) on demand.
 * Pass `null` as category to skip fetching.
 */
export function useCategoryBlocks(category: string | null, subcategory?: string | null, style?: string | null) {
  const params = new URLSearchParams();
  if (category) {
    params.set("category", category);
    params.set("include", "structure");
    params.set("limit", "100");
    params.set("sort", "name");
  }
  if (subcategory) {
    params.set("subcategory", subcategory);
  }
  if (style) {
    params.set("style", style);
  }

  const key = category ? `/api/v1/components?${params.toString()}` : null;

  const { data, isLoading } = useSWR(
    key,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 120000 }
  );

  return {
    blocks: (data?.components || []) as BlockItem[],
    isLoading,
  };
}

/**
 * Search blocks across all categories by query string.
 * Returns blocks with structure for preview.
 */
export function useBlockSearch(query: string | null) {
  const key = query && query.trim().length >= 2
    ? `/api/v1/components?q=${encodeURIComponent(query.trim())}&include=structure&limit=30&sort=name`
    : null;

  const { data, isLoading } = useSWR(
    key,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  );

  return {
    blocks: (data?.components || []) as BlockItem[],
    isLoading,
  };
}
