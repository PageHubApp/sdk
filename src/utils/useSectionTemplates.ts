import useSWR from "swr";
import { tryDecompressBase64LzToJson } from "../../../../utils/lz";

interface SectionTemplate {
  slug: string;
  name: string;
  category: string;
  subcategory?: string;
  structure: any;
  isCategoryPreview?: boolean;
}

interface SectionTemplateData {
  categories: { id: string; name: string; order?: number }[];
  templates: Record<string, SectionTemplate[]>;
}

const fetcher = (url: string) =>
  fetch(url)
    .then(r => r.json())
    .then(data => ({
      ...data,
      components: Array.isArray(data?.components)
        ? data.components.map((component: any) => {
            const structure =
              typeof component?.structure === "string"
                ? tryDecompressBase64LzToJson(component.structure)
                : component?.structure;
            return structure ? { ...component, structure } : component;
          })
        : [],
    }));

export function useSectionTemplates(): { data: SectionTemplateData | null; isLoading: boolean } {
  const { data, isLoading } = useSWR(
    "/api/v1/components?include=structure&limit=100&sort=name",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  if (!data?.components) return { data: null, isLoading };

  // Transform flat component list into the { categories, templates } shape
  const byCategory: Record<string, SectionTemplate[]> = {};
  const categorySet = new Map<string, { id: string; name: string; order: number }>();

  for (const comp of data.components) {
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
