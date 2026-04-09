import useSWR from "swr";

export interface BlockSubcategory {
  name: string;
  count: number;
}

export interface BlockCategory {
  id: string;
  name: string;
  total: number;
  subcategories: BlockSubcategory[];
  styles: BlockSubcategory[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Lightweight hook that fetches category metadata (names, counts, subcategories).
 * No structure data — fast and small payload.
 */
export function useBlockCategories() {
  const { data, isLoading } = useSWR<{ categories: BlockCategory[] }>(
    "/api/v1/components/categories",
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 120000 }
  );

  return { categories: data?.categories || [], isLoading };
}
