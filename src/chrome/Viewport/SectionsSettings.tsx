import { useEditor } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TbLoader2, TbSearch } from "react-icons/tb";
import { usePanelUrl } from "../../utils/usePanelUrl";
import { ComponentsAtom } from "utils/lib";
import { useBlockCategories, type BlockCategory } from "../../utils/useBlockCategories";
import { AutoHideScrollbar } from "../shared/layout";
import { CategoryCard, CustomSectionCard, BlockPreviewCard } from "./SectionsSettings/components";
import { CategoryDetailView } from "./SectionsSettings/CategoryDetailView";
import { SearchResultsView } from "./SectionsSettings/SearchResultsView";
import { CATEGORY_ORDER } from "./SectionsSettings/blockHelpers";
import { CustomSectionsGrid } from "./SectionsSettings/CustomSectionsGrid";

export { BlockPreviewCard, CustomSectionCard };

export function SectionsSettings() {
  const { query } = useEditor();
  const { categories, isLoading } = useBlockCategories();
  const components = useAtomValue(ComponentsAtom);

  const {
    state: params,
    navigate: panelNavigate,
    enterSearchMode,
    update: panelUpdate,
  } = usePanelUrl();

  const [searchInput, setSearchInput] = useState(params.q ?? "");
  const focusRef = useRef(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const isSearchMode = searchInput.trim().length >= 2;

  // Sort categories by our preferred order
  const sortedCategories = useMemo(() => {
    const ordered: BlockCategory[] = [];
    const remaining: BlockCategory[] = [];

    for (const cat of categories) {
      const idx = CATEGORY_ORDER.indexOf(cat.id);
      if (idx >= 0) {
        ordered[idx] = cat;
      } else {
        remaining.push(cat);
      }
    }

    return [...ordered.filter(Boolean), ...remaining];
  }, [categories]);

  // Derive selectedCategory from URL params
  const selectedCategory = useMemo(() => {
    if (!params.cat) return null;
    return sortedCategories.find(c => c.id === params.cat) ?? null;
  }, [params.cat, sortedCategories]);

  // Custom sections from current page
  const customSections = useMemo(() => {
    return components
      .filter(c => c.isSection)
      .map(component => ({
        id: component.rootNodeId,
        name: component.name,
        isCustom: true,
        rootNodeId: component.rootNodeId,
      }));
  }, [components]);

  useEffect(() => {
    const time = setTimeout(() => focusRef?.current?.focus(), 50);
    return () => clearTimeout(time);
  }, []);

  // Sync search input from URL params (e.g. on popstate/back)
  useEffect(() => {
    setSearchInput(params.q ?? "");
  }, [params.q]);

  // Debounce search input -> URL param
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);

    if (value.trim().length >= 2) {
      enterSearchMode();
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.trim().length >= 2) {
        panelUpdate({ q: value });
      } else {
        panelUpdate({ q: null });
      }
    }, 300);
  }, [enterSearchMode, panelUpdate]);

  // Category drill-in view
  if (selectedCategory && !isSearchMode) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <CategoryDetailView
          category={selectedCategory}
          categories={sortedCategories}
          onBack={() => history.back()}
          activeSubcategory={params.sub}
          onSubcategoryChange={(sub) => panelNavigate({ sub })}
          onCategoryChange={(catId) => panelNavigate({ cat: catId, sub: null, q: null })}
        />
      </div>
    );
  }

  // Main view: search bar + category grid
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-sidebar">
      {/* Search bar */}
      <div className="flex items-center gap-2 border-b border-border bg-background p-3">
        <div className="relative flex-1">
          <TbSearch className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search blocks..."
            className="input-transparent pl-8"
            ref={focusRef}
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Search results */}
      {isSearchMode ? (
        <SearchResultsView query={searchInput} />
      ) : (
        <AutoHideScrollbar className="flex-1">
          <div className="p-3">
            {/* Custom sections */}
            {customSections.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  My Blocks ({customSections.length})
                </div>
                <CustomSectionsGrid
                  sections={customSections}
                />
              </div>
            )}

            {/* Category grid */}
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <TbLoader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {sortedCategories.map(cat => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onClick={() => panelNavigate({ cat: cat.id, sub: null, q: null })}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0" style={{ minHeight: "70vh" }} />
        </AutoHideScrollbar>
      )}
    </div>
  );
}
