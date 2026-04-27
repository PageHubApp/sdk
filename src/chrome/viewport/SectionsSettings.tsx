import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { useAtomValue } from "@zedux/react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TbLoader2, TbPalette, TbSearch } from "react-icons/tb";
import { usePanelUrl } from "../../utils/usePanelUrl";
import { ComponentsAtom } from "../../utils/lib";
import { useBlockCategories, type BlockCategory } from "../../utils/useBlockCategories";
import { AutoHideScrollbar } from "@/chrome/primitives/layout";
import {
  CategoryCard,
  CustomSectionCard,
  BlockPreviewCard,
  FilterDropdown,
} from "./sections-settings/components";
import { CategoryDetailView } from "./sections-settings/CategoryDetailView";
import { MyBlocksCategoryView } from "./sections-settings/MyBlocksCategoryView";
import { SearchResultsView } from "./sections-settings/SearchResultsView";
import {
  buildWorkspaceBlockCategory,
  CATEGORY_ORDER,
  WORKSPACE_BLOCKS_CATEGORY_ID,
} from "./sections-settings/blockHelpers";

export { BlockPreviewCard, CustomSectionCard };

export function SectionsSettings() {
  const { query } = useEditor();
  const { categories, isLoading } = useBlockCategories();
  const components = useAtomValue(ComponentsAtom);

  // The site's buildStyle (set via MCP `set_theme` or on template creation) seeds the style
  // filter in the block picker so blocks stay visually cohesive with the rest of the site.
  const { siteStyle } = useEditor(state => {
    const s = state.nodes[ROOT_NODE]?.data?.props?.buildStyle;
    return { siteStyle: typeof s === "string" && s ? s : null };
  });

  const {
    state: params,
    navigate: panelNavigate,
    enterSearchMode,
    update: panelUpdate,
  } = usePanelUrl();

  const [searchInput, setSearchInput] = useState(params.q ?? "");
  const focusRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [styleOpen, setStyleOpen] = useState(false);
  // Once the user explicitly clears the style pill, suppress auto-apply of siteStyle for the
  // rest of the session. Full reload resets this flag — buildStyle is the canonical default.
  const userClearedStyleRef = useRef(false);

  const isSearchMode = searchInput.trim().length >= 2;

  // Active style: URL param wins; otherwise fall back to site style unless the user cleared it.
  const effectiveSiteStyle = userClearedStyleRef.current ? null : siteStyle;
  const activeStyle: string | null = params.sty ?? effectiveSiteStyle;
  const isAutoApplied = !params.sty && !!effectiveSiteStyle;

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

  const workspaceCategory = useMemo(
    () => (customSections.length > 0 ? buildWorkspaceBlockCategory(customSections.length) : null),
    [customSections.length]
  );

  // Aggregate style options across all categories (for the main-grid style dropdown).
  // We only surface styles that are actually tagged somewhere.
  const allStyles = useMemo(() => {
    const counts = new Map<string, number>();
    for (const cat of categories) {
      for (const s of cat.styles || []) {
        counts.set(s.name, (counts.get(s.name) || 0) + s.count);
      }
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  // Per-category count of blocks matching the active style (used for `CategoryCard.filteredCount`).
  const filteredCountsByCategory = useMemo(() => {
    if (!activeStyle) return null;
    const map: Record<string, number> = {};
    for (const cat of categories) {
      const hit = (cat.styles || []).find(s => s.name === activeStyle);
      map[cat.id] = hit?.count ?? 0;
    }
    return map;
  }, [categories, activeStyle]);

  // Derive selectedCategory from URL params (API categories + client-only workspace category)
  const selectedCategory = useMemo(() => {
    if (!params.cat) return null;
    if (params.cat === WORKSPACE_BLOCKS_CATEGORY_ID) {
      if (customSections.length === 0) return null;
      return workspaceCategory;
    }
    return sortedCategories.find(c => c.id === params.cat) ?? null;
  }, [params.cat, sortedCategories, customSections.length, workspaceCategory]);

  // Deep-link / bookmark: clear reserved cat when there are no saved blocks
  useEffect(() => {
    if (params.cat === WORKSPACE_BLOCKS_CATEGORY_ID && customSections.length === 0) {
      panelUpdate({ cat: null });
    }
  }, [params.cat, customSections.length, panelUpdate]);

  useEffect(() => {
    const time = setTimeout(() => focusRef?.current?.focus(), 50);
    return () => clearTimeout(time);
  }, []);

  // Sync search input from URL params (e.g. on popstate/back)
  useEffect(() => {
    setSearchInput(params.q ?? "");
  }, [params.q]);

  // Debounce search input -> URL param
  const handleSearchChange = useCallback(
    (value: string) => {
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
    },
    [enterSearchMode, panelUpdate]
  );

  // Category drill-in view
  if (selectedCategory && !isSearchMode) {
    if (selectedCategory.id === WORKSPACE_BLOCKS_CATEGORY_ID) {
      return (
        <div className="flex flex-1 flex-col overflow-hidden">
          <MyBlocksCategoryView sections={customSections} onBack={() => history.back()} />
        </div>
      );
    }
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <CategoryDetailView
          category={selectedCategory}
          categories={sortedCategories}
          onBack={() => history.back()}
          activeSubcategory={params.sub}
          activeStyle={activeStyle}
          siteStyle={effectiveSiteStyle}
          onSubcategoryChange={sub => panelNavigate({ sub })}
          onStyleChange={sty => {
            if (!sty) userClearedStyleRef.current = true;
            else userClearedStyleRef.current = false;
            panelNavigate({ sty });
          }}
          onCategoryChange={catId => panelNavigate({ cat: catId, sub: null, sty: null, q: null })}
        />
      </div>
    );
  }

  const styleLabel = activeStyle
    ? `${activeStyle.charAt(0).toUpperCase() + activeStyle.slice(1)}`
    : null;
  const hasStyleOptions = allStyles.length > 0;
  // Workspace (user's saved blocks) doesn't live in the API and so isn't style-tagged —
  // never dim/filter its count even when a style is active.
  const workspaceFilteredCount = filteredCountsByCategory != null ? null : null;

  // Main view: search bar + category grid
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Search bar + style filter */}
      <div className="border-base-300 bg-base-100 flex items-center gap-2 border-b p-3">
        <div className="relative flex-1">
          <TbSearch className="text-neutral-content absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search blocks..."
            className="input-transparent pl-8"
            ref={focusRef}
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
          />
        </div>
        {hasStyleOptions && (
          <FilterDropdown
            label="Style"
            icon={TbPalette}
            activeValue={styleLabel}
            isAutoApplied={isAutoApplied}
            isOpen={styleOpen}
            onToggle={() => setStyleOpen(!styleOpen)}
            onClose={() => setStyleOpen(false)}
            onClear={() => {
              userClearedStyleRef.current = true;
              panelUpdate({ sty: null });
            }}
            items={allStyles}
            activeKey={activeStyle}
            onSelect={name => {
              userClearedStyleRef.current = false;
              panelUpdate({ sty: name });
              setStyleOpen(false);
            }}
          />
        )}
      </div>

      {/* Search results */}
      {isSearchMode ? (
        <SearchResultsView query={searchInput} style={activeStyle} />
      ) : (
        <AutoHideScrollbar className="flex-1">
          <div className="p-3">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <TbLoader2 className="text-neutral-content size-5 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {workspaceCategory ? (
                  <CategoryCard
                    key={WORKSPACE_BLOCKS_CATEGORY_ID}
                    category={workspaceCategory}
                    filteredCount={workspaceFilteredCount}
                    onClick={() =>
                      panelNavigate({
                        cat: WORKSPACE_BLOCKS_CATEGORY_ID,
                        sub: null,
                        sty: null,
                        q: null,
                      })
                    }
                  />
                ) : null}
                {sortedCategories.map(cat => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    filteredCount={
                      filteredCountsByCategory ? (filteredCountsByCategory[cat.id] ?? 0) : null
                    }
                    onClick={() => panelNavigate({ cat: cat.id, sub: null, sty: null, q: null })}
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
