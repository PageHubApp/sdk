import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { useAtomValue } from "@zedux/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { TbPalette } from "react-icons/tb";
import { FilterDropdown } from "../../primitives/FilterDropdown";
import { PanelBody, PanelScrollSpacer } from "../../primitives/PanelBody";
import { PanelHeaderRow } from "../../primitives/PanelHeaderRow";
import { PanelLoadingState } from "../../primitives/PanelLoadingState";
import { SearchInput } from "../../primitives/SearchInput";
import { usePanelSearch } from "../../hooks/usePanelSearch";
import { usePanelUrl } from "../../../utils/usePanelUrl";
import { ComponentsAtom } from "../../../utils/atoms";
import { useBlockCategories, type BlockCategory } from "../../../utils/useBlockCategories";
import { AutoHideScrollbar } from "../../primitives/layout/AutoHideScrollbar";
import { CategoryCard, CustomSectionCard, BlockPreviewCard } from "./sections-settings/components";
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

  const { state: params, navigate: panelNavigate, update: panelUpdate } = usePanelUrl();

  const {
    value: searchInput,
    focusRef,
    onChange: handleSearchChange,
    isSearchMode,
  } = usePanelSearch({ minLength: 2 });
  const [styleOpen, setStyleOpen] = useState(false);
  // Once the user explicitly clears the style pill, suppress auto-apply of siteStyle for the
  // rest of the session. Full reload resets this flag — buildStyle is the canonical default.
  const userClearedStyleRef = useRef(false);

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

  // Category drill-in view
  if (selectedCategory && !isSearchMode) {
    if (selectedCategory.id === WORKSPACE_BLOCKS_CATEGORY_ID) {
      return (
        <PanelBody>
          <MyBlocksCategoryView sections={customSections} onBack={() => history.back()} />
        </PanelBody>
      );
    }
    return (
      <PanelBody>
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
      </PanelBody>
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
    <PanelBody>
      {/* Search bar + style filter */}
      <PanelHeaderRow>
        <SearchInput
          ref={focusRef}
          value={searchInput}
          onChange={handleSearchChange}
          placeholder="Search blocks..."
          size="slim"
        />
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
      </PanelHeaderRow>

      {/* Search results */}
      {isSearchMode ? (
        <SearchResultsView query={searchInput} style={activeStyle} />
      ) : (
        <AutoHideScrollbar className="flex-1">
          <div className="p-3">
            {isLoading ? (
              <PanelLoadingState />
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
          <PanelScrollSpacer />
        </AutoHideScrollbar>
      )}
    </PanelBody>
  );
}
