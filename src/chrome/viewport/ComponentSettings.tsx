import { useAtomValue } from "@zedux/react";
import { useEffect, useMemo, useState } from "react";
import { TbCategory } from "react-icons/tb";
import { ComponentsAtom } from "../../utils/lib";
import { useCustomComponents } from "../../define";
import { AutoHideScrollbar } from "@/chrome/primitives/layout";
import {
  FilterDropdown,
  PanelBody,
  PanelHeaderRow,
  PanelScrollSpacer,
  SearchInput,
} from "@/chrome/primitives";
import { usePanelSearch } from "@/chrome/hooks";
import { buildCustomToolboxEntries } from "./toolbox/customComponents";
import { SavedComponentsToolbox } from "./toolbox/savedComponentsToolbox";

// All built-in components now served via defineComponent() toolbox categories.
// Categories are defined as empty shells here and populated dynamically
// from the CustomComponentsContext merge below.
const baseItems = [
  { title: "Layout", content: [] as any[] },
  { title: "Text", content: [] as any[] },
  { title: "Buttons", content: [] as any[] },
  { title: "Images", content: [] as any[] },
  { title: "Icons", content: [] as any[] },
  { title: "Interactive", content: [] as any[] },
  { title: "Navigation", content: [] as any[] },
  { title: "Forms", content: [] as any[] },
  { title: "Media", content: [] as any[] },
  { title: "Embeds", content: [] as any[] },
  { title: "Dividers", content: [] as any[] },
  { title: "Stripe", content: [] as any[] },
  { title: "Lists", content: [] as any[] },
  { title: "Tables", content: [] as any[] },
  { title: "Grid", content: [] as any[] },
  { title: "Components", content: [] as any[] },
];

export const ComponentSettings = () => {
  const components = useAtomValue(ComponentsAtom);
  const { toolboxCategories } = useCustomComponents();
  const [list, setList] = useState(baseItems);

  const {
    value: search,
    focusRef,
    onChange: handleSearchChange,
  } = usePanelSearch({ minLength: 1 });
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);

  // Flatten all presets across all defs into per-preset entries tagged with
  // their target toolbox category (`preset.category ?? def.category`).
  const customItems = useMemo(() => {
    if (!toolboxCategories?.length) return [] as { title: string; content: any[] }[];
    const buckets = new Map<string, any[]>();
    for (const cat of toolboxCategories) {
      for (const def of cat.content) {
        for (const { category, entry } of buildCustomToolboxEntries(def)) {
          if (!buckets.has(category)) buckets.set(category, []);
          buckets.get(category)!.push(entry);
        }
      }
    }
    return Array.from(buckets.entries()).map(([title, content]) => ({ title, content }));
  }, [toolboxCategories]);

  // Merge categorized entries into base categories; append new categories
  // (e.g. host-defined ones) as needed.
  const items = useMemo(() => {
    const merged = baseItems.map(item => ({ ...item, content: [...item.content] }));

    for (const custom of customItems) {
      if (custom.title.startsWith("__")) continue;
      const existing = merged.find(item => item.title === custom.title);
      if (existing) {
        existing.content.push(...custom.content);
      } else {
        merged.push(custom);
      }
    }

    if (components?.filter(component => !component.isSection)?.length) {
      merged.push(SavedComponentsToolbox(components));
    }

    return merged;
  }, [components, customItems]);

  useEffect(() => {
    const scoped = categoryFilter ? items.filter(item => item.title === categoryFilter) : items;

    if (search) {
      const searchTerm = search.toLowerCase();
      setList(
        scoped
          .map(item => {
            const title = item.title.toString().toLowerCase() || "";

            const filteredContent = item.content.filter(nestedItem => {
              // Extract searchable text from React element props (circular-ref safe)
              const props = nestedItem?.props ?? {};
              const searchable = [
                props.custom?.displayName,
                props.display?.props?.label,
                nestedItem?.key,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
              return searchable.includes(searchTerm);
            });

            // Only return category if it has matching content (always filter items)
            if (filteredContent.length > 0) {
              return { ...item, content: filteredContent };
            }
            // If title matches but no content matches, still show the category but with all items
            if (title.includes(searchTerm)) {
              return item;
            }
            return null;
          })
          .filter(item => item !== null)
      );
      return;
    }

    setList(scoped);
  }, [search, items, categoryFilter]);

  const categoryItems = useMemo(
    () =>
      items
        .filter(item => item.content.length > 0 && !item.title.startsWith("__"))
        .map(item => ({ name: item.title, count: item.content.length })),
    [items]
  );

  return (
    <PanelBody>
      <PanelHeaderRow>
        <SearchInput
          ref={focusRef}
          value={search}
          onChange={handleSearchChange}
          placeholder="Search components..."
          size="slim"
        />
        {categoryItems.length > 0 && (
          <FilterDropdown
            label="Category"
            icon={TbCategory}
            activeValue={categoryFilter}
            isOpen={categoryOpen}
            onToggle={() => setCategoryOpen(!categoryOpen)}
            onClose={() => setCategoryOpen(false)}
            onClear={() => setCategoryFilter(null)}
            items={categoryItems}
            activeKey={categoryFilter}
            onSelect={name => {
              setCategoryFilter(name);
              setCategoryOpen(false);
            }}
          />
        )}
      </PanelHeaderRow>
      <AutoHideScrollbar className="flex-1">
        {list?.map((a, k) => (
          <div key={k} className="border-base-300">
            <div className="text-secondary-content mt-3 mb-1 ml-4 text-xs font-bold">{a.title}</div>

            <div className="border-base-300 grid w-full grid-cols-3 gap-3 border-t p-3">
              {a.content.map((item, kk) => (
                <div key={kk} className="flex min-w-0 justify-center">
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}
        <PanelScrollSpacer />
      </AutoHideScrollbar>
    </PanelBody>
  );
};
