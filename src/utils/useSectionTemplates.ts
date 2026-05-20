import useSWR from "swr";
import { getBlocksProvider } from "../define/blocksProvider";
import type { BlockItem } from "../define/blocksProvider";

interface SectionTemplateData {
  categories: { id: string; name: string; order?: number }[];
  templates: Record<string, BlockItem[]>;
}

export function useSectionTemplates(): { data: SectionTemplateData | null; isLoading: boolean } {
  const { data, isLoading } = useSWR<BlockItem[]>(
    "pagehub:blocks:section-templates",
    () => getBlocksProvider().listBlocks({ limit: 100, sort: "name", includeStructure: true }),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  if (!data || data.length === 0) return { data: null, isLoading };

  // Transform flat block list into the { categories, templates } shape the panel expects.
  const byCategory: Record<string, BlockItem[]> = {};
  const categorySet = new Map<string, { id: string; name: string; order: number }>();

  for (const comp of data) {
    const cat = comp.category || "uncategorized";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(comp);
    if (!categorySet.has(cat)) {
      categorySet.set(cat, { id: cat, name: cat.charAt(0).toUpperCase() + cat.slice(1), order: 0 });
    }
  }

  return {
    data: {
      categories: Array.from(categorySet.values()),
      templates: byCategory,
    },
    isLoading,
  };
}
