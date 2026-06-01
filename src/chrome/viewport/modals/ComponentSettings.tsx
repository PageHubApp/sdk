import { useAtomValue } from "@zedux/react";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { TbCategory } from "react-icons/tb";
import { ComponentsAtom } from "../../../utils/atoms";
import { useCustomComponents } from "../../../define/context";
import { AutoHideScrollbar } from "../../primitives/layout/AutoHideScrollbar";
import { FilterDropdown } from "../../primitives/FilterDropdown";
import { PanelBody, PanelScrollSpacer } from "../../primitives/PanelBody";
import { PanelHeaderRow } from "../../primitives/PanelHeaderRow";
import { SearchInput } from "../../primitives/SearchInput";
import { usePanelSearch } from "../../hooks/usePanelSearch";
import { buildCustomToolboxEntries } from "../toolbox/customComponents";
import { SavedComponentsToolbox } from "../toolbox/savedComponentsToolbox";

// A toolbox category bucket: a labeled list of pre-rendered toolbox entry
// elements (produced by `buildCustomToolboxEntries` / `SavedComponentsToolbox`).
type ToolboxCategory = { title: string; content: ReactElement[] };

// All built-in components now served via defineComponent() toolbox categories.
// Categories are defined as empty shells here and populated dynamically
// from the CustomComponentsContext merge below.
const baseItems: ToolboxCategory[] = [
  { title: "Layout", content: [] },
  { title: "Text", content: [] },
  { title: "Buttons", content: [] },
  { title: "Images", content: [] },
  { title: "Icons", content: [] },
  { title: "Interactive", content: [] },
  { title: "Navigation", content: [] },
  { title: "Forms", content: [] },
  { title: "Media", content: [] },
  { title: "Embeds", content: [] },
  { title: "Dividers", content: [] },
  { title: "Stripe", content: [] },
  { title: "Lists", content: [] },
  { title: "Tables", content: [] },
  { title: "Grid", content: [] },
  { title: "Components", content: [] },
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
  const customItems = useMemo<ToolboxCategory[]>(() => {
    if (!toolboxCategories?.length) return [];
    const buckets = new Map<string, ReactElement[]>();
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
    // Always drop empty categories from the render set so hardcoded `baseItems`
    // shells (Forms, Media, Lists, etc.) don't render their headers when nothing
    // is bucketed under them. The filter dropdown already does the same trim.
    const nonEmpty = items.filter(item => item.content.length > 0 && !item.title.startsWith("__"));
    const scoped = categoryFilter
      ? nonEmpty.filter(item => item.title === categoryFilter)
      : nonEmpty;

    if (search) {
      const searchTerm = search.toLowerCase();
      setList(
        scoped
          .map(item => {
            const title = item.title.toString().toLowerCase() || "";

            const filteredContent = item.content.filter(nestedItem => {
              // Extract searchable text from React element props (circular-ref safe).
              // Toolbox entries are produced by `RenderToolComponent`, which
              // accepts arbitrary props — narrow to just the fields we read.
              const props = (nestedItem?.props ?? {}) as {
                custom?: { displayName?: string };
                display?: { props?: { label?: string } };
              };
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
