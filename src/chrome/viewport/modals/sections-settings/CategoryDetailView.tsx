import { useEditor } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TbArrowLeft, TbChevronLeft, TbChevronRight, TbPalette } from "react-icons/tb";
import { SectionPickerDialogAtom } from "../../../../utils/atoms";
import { useSetAtomState } from "../../../../utils/atoms";
import type { BlockCategory } from "../../../../utils/useBlockCategories";
import { useCategoryBlocks, type BlockItem } from "../../../../utils/useCategoryBlocks";
import { useInsertTarget } from "../../../hooks/useInsertTarget";
import { AutoHideScrollbar } from "../../../primitives/layout/AutoHideScrollbar";
import { FilterDropdown } from "../../../primitives/FilterDropdown";
import { PanelHeaderRow } from "../../../primitives/PanelHeaderRow";
import { PanelLoadingState } from "../../../primitives/PanelLoadingState";
import { AddElement } from "../../toolbox/toolboxUtils";
import { BlockPreviewCard, BlockQuickLook } from "./components";
import { buildElementFromStructure } from "./blockHelpers";
import { useRegistries } from "../../../../registry";
import { setSectionsBackref } from "../../../../registry/sectionsBackref";

const PAGE_SIZE = 6;

interface CategoryDetailViewProps {
  category: BlockCategory;
  categories: BlockCategory[];
  onBack: () => void;
  activeSubcategory: string | null;
  activeStyle: string | null;
  /** The site's own buildStyle (ROOT.props.buildStyle). When set and this category has blocks
   *  tagged with that style, the filter auto-applies on mount for visual cohesion. */
  siteStyle?: string | null;
  onSubcategoryChange: (sub: string | null) => void;
  onStyleChange: (style: string | null) => void;
  onCategoryChange: (catId: string) => void;
}

export function CategoryDetailView({
  category,
  categories,
  onBack,
  activeSubcategory,
  activeStyle,
  siteStyle,
  onSubcategoryChange,
  onStyleChange,
  onCategoryChange,
}: CategoryDetailViewProps) {
  const { actions, query } = useEditor();
  const {
    connectors: { create },
  } = useEditor(state => ({ enabled: state.options.enabled }));
  const resolver = useMemo(() => {
    try {
      return (query as any).getOptions?.()?.resolver ?? {};
    } catch {
      return {};
    }
  }, [query]);

  const positionInfo = useAtomValue(SectionPickerDialogAtom);
  const setPositionInfo = useSetAtomState(SectionPickerDialogAtom);
  const { getTargetPageId } = useInsertTarget();

  const { blocks, isLoading } = useCategoryBlocks(category.id, activeSubcategory, activeStyle);

  const currentIndex = categories.findIndex(c => c.id === category.id);
  const prevCategory = currentIndex > 0 ? categories[currentIndex - 1] : null;
  const nextCategory = currentIndex < categories.length - 1 ? categories[currentIndex + 1] : null;

  const insertElement = useCallback(
    (element: any) => {
      if (!element) return;
      if (positionInfo.nodeId && positionInfo.parent) {
        const parentNodeData = query.node(positionInfo.parent).get();
        const currentIndex = parentNodeData.data.nodes.indexOf(positionInfo.nodeId);
        const newIndex = positionInfo.position === "bottom" ? currentIndex + 1 : currentIndex;
        AddElement({ element, actions, query, addTo: positionInfo.parent, index: newIndex });
        setPositionInfo({ isOpen: false, nodeId: null, position: null, parent: null });
      } else {
        const targetPageId = getTargetPageId();
        AddElement({ element, actions, query, addTo: targetPageId });
      }
    },
    [actions, query, positionInfo, setPositionInfo, getTargetPageId]
  );

  const handleDoubleClick = useCallback(
    (block: BlockItem) => {
      const element = buildElementFromStructure(block.structure, block.slug, false, resolver, {
        pendingBlockModifiers: block.modifiers,
      });
      insertElement(element);
    },
    [resolver, insertElement]
  );

  const [filterOpen, setFilterOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [quickLookBlock, setQuickLookBlock] = useState<BlockItem | null>(null);
  const [quickLookRect, setQuickLookRect] = useState<DOMRect | null>(null);
  const [isHoveringCard, setIsHoveringCard] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const hoveredRef = useRef<{ block: BlockItem; rect: DOMRect } | null>(null);
  const hasSubcategories = category.subcategories.length > 0;
  const hasStyles = category.styles?.length > 0;

  // Auto-apply the site's buildStyle when the user enters a category, as long as that category
  // actually has blocks tagged with that style. Only fires when no style is already active, and
  // only once per (category, siteStyle) pair — so the user can still clear it manually.
  const autoAppliedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!siteStyle || activeStyle) return;
    if (!hasStyles) return;
    const match = category.styles.find(s => s.name === siteStyle);
    if (!match) return;
    const key = `${category.id}:${siteStyle}`;
    if (autoAppliedRef.current === key) return;
    autoAppliedRef.current = key;
    onStyleChange(siteStyle);
  }, [siteStyle, activeStyle, hasStyles, category.id, category.styles, onStyleChange]);

  const hasUsedQuickLook = useRef(false);

  // Registry hookup for the Space-key quick-look toggle. Lives here (above
  // handleBlockHover) so the context.set call inside the hover callback can
  // reach the registry.
  const { context } = useRegistries();

  const handleBlockHover = useCallback(
    (block: BlockItem, rect: DOMRect) => {
      hoveredRef.current = { block, rect };
      setIsHoveringCard(true);
      // Publish for `ph.sections.toggleQuickLook` when-clause gating.
      context.set("sections.hoveredBlock", block.slug);
      if (quickLookBlock) {
        setQuickLookBlock(block);
        setQuickLookRect(rect);
      }
    },
    [context, quickLookBlock]
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [blocks]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || visibleCount >= blocks.length) return;
    const observer = new IntersectionObserver(
      entries => {
        if (!entries[0]?.isIntersecting) return;
        setVisibleCount(count => Math.min(count + PAGE_SIZE, blocks.length));
      },
      { rootMargin: "240px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleCount, blocks.length]);

  // Space (toggle quick look) migrated to `ph.sections.toggleQuickLook`
  // via the registry dispatcher (priority 50 — beats `ph.editor.clearSelection`
  // since the modal hosts non-canvas focus). Escape closer stays inline:
  // the quick-look overlay is a transient peek, not a stacked dialog.
  useEffect(() => {
    if (!quickLookBlock) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setQuickLookBlock(null);
      setQuickLookRect(null);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [quickLookBlock]);

  // Publish surface context + register the Space-key toggle so the registry
  // chord can drive the same code path.
  useEffect(() => {
    context.set("sections.modalOpen", true);
    return () => {
      context.set("sections.modalOpen", false);
      context.set("sections.hoveredBlock", null);
    };
  }, [context]);

  useEffect(() => {
    setSectionsBackref({
      toggleQuickLook: () => {
        if (quickLookBlock) {
          setQuickLookBlock(null);
          setQuickLookRect(null);
          return;
        }
        if (hoveredRef.current) {
          setQuickLookBlock(hoveredRef.current.block);
          setQuickLookRect(hoveredRef.current.rect);
          hasUsedQuickLook.current = true;
        }
      },
    });
    return () => setSectionsBackref(null);
  }, [quickLookBlock]);

  const activeLabel = activeSubcategory
    ? `${activeSubcategory.charAt(0).toUpperCase() + activeSubcategory.slice(1)}`
    : null;
  const styleLabel = activeStyle
    ? `${activeStyle.charAt(0).toUpperCase() + activeStyle.slice(1)}`
    : null;
  const visibleBlocks = useMemo(() => blocks.slice(0, visibleCount), [blocks, visibleCount]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <PanelHeaderRow>
        <button
          onClick={onBack}
          className="hover:bg-neutral cursor-pointer rounded-md p-1 transition-colors"
        >
          <TbArrowLeft className="size-4" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="text-sm font-medium">{category.name}</div>
          <span className="text-neutral-content text-xs">{category.total}</span>
        </div>

        {/* Style dropdown (palette) */}
        {hasStyles && (
          <FilterDropdown
            label="Style"
            icon={TbPalette}
            activeValue={styleLabel}
            isAutoApplied={!!activeStyle && activeStyle === siteStyle}
            isOpen={styleOpen}
            onToggle={() => {
              setStyleOpen(!styleOpen);
              setFilterOpen(false);
            }}
            onClose={() => setStyleOpen(false)}
            onClear={() => onStyleChange(null)}
            items={category.styles}
            activeKey={activeStyle}
            onSelect={name => {
              onStyleChange(name);
              setStyleOpen(false);
            }}
          />
        )}

        {/* Filter dropdown */}
        {hasSubcategories && (
          <FilterDropdown
            label="Filter"
            activeValue={activeLabel}
            isOpen={filterOpen}
            onToggle={() => {
              setFilterOpen(!filterOpen);
              setStyleOpen(false);
            }}
            onClose={() => setFilterOpen(false)}
            onClear={() => onSubcategoryChange(null)}
            items={category.subcategories}
            activeKey={activeSubcategory}
            onSelect={name => {
              onSubcategoryChange(name);
              setFilterOpen(false);
            }}
          />
        )}
      </PanelHeaderRow>

      {/* Block list */}
      {isLoading ? (
        <PanelLoadingState fill />
      ) : (
        <AutoHideScrollbar className="flex-1">
          <div
            className="grid w-full grid-cols-1 gap-3 p-3 pt-1"
            onMouseLeave={() => {
              setIsHoveringCard(false);
              hoveredRef.current = null;
              context.set("sections.hoveredBlock", null);
            }}
          >
            {visibleBlocks.map(block => (
              <BlockPreviewCard
                key={block.slug || block._id}
                block={block}
                resolver={resolver}
                onDoubleClick={() => handleDoubleClick(block)}
                onDragRef={ref => {
                  if (!ref) return;
                  ref.setAttribute("data-create-type", "section");
                  const tool = buildElementFromStructure(
                    block.structure,
                    block.slug,
                    false,
                    resolver,
                    { pendingBlockModifiers: block.modifiers }
                  );
                  if (tool) create(ref, tool);
                }}
                onHover={handleBlockHover}
                onDismissQuickLook={() => {
                  setQuickLookBlock(null);
                  setQuickLookRect(null);
                }}
                quickLookOpen={quickLookBlock?.slug === block.slug}
              />
            ))}
            {visibleCount < blocks.length && <div ref={loadMoreRef} className="h-8" />}
          </div>
          {blocks.length === 0 && (
            <div className="flex h-32 items-center justify-center">
              <p className="text-neutral-content text-sm">No blocks in this category.</p>
            </div>
          )}
          <div className="shrink-0" style={{ minHeight: "70vh" }} />
        </AutoHideScrollbar>
      )}

      {/* Spacebar Quick Look */}
      {quickLookBlock && (
        <BlockQuickLook
          key={quickLookBlock.slug}
          block={quickLookBlock}
          resolver={resolver}
          originRect={quickLookRect}
        />
      )}

      {/* Spacebar hint — fades in on card hover, fades out on leave, hidden after first use */}
      {!hasUsedQuickLook.current && !quickLookBlock && (
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-14 z-50 flex justify-center transition-opacity duration-300 ${isHoveringCard ? "opacity-100" : "opacity-0"}`}
        >
          <div className="bg-base-300 text-base-content rounded-md px-2.5 py-1 text-[11px] whitespace-nowrap shadow-lg">
            <kbd className="bg-base-100 mr-1 rounded px-1 py-0.5 font-mono text-[10px]">Space</kbd>
            to preview
          </div>
        </div>
      )}

      {/* Prev / Next category nav */}
      {(prevCategory || nextCategory) && (
        <div className="border-base-300 flex items-stretch border-t">
          {prevCategory ? (
            <button
              onClick={() => onCategoryChange(prevCategory.id)}
              className="hover:bg-neutral flex flex-1 cursor-pointer items-center gap-1.5 px-3 py-4 text-left transition-colors"
            >
              <TbChevronLeft className="text-neutral-content size-3.5 shrink-0" />
              <span className="text-neutral-content min-w-0 truncate text-xs font-medium">
                {prevCategory.name}
              </span>
            </button>
          ) : (
            <div className="flex-1" />
          )}
          {prevCategory && nextCategory && <div className="bg-border w-px" />}
          {nextCategory ? (
            <button
              onClick={() => onCategoryChange(nextCategory.id)}
              className="hover:bg-neutral flex flex-1 cursor-pointer items-center justify-end gap-1.5 px-3 py-4 text-right transition-colors"
            >
              <span className="text-neutral-content min-w-0 truncate text-xs font-medium">
                {nextCategory.name}
              </span>
              <TbChevronRight className="text-neutral-content size-3.5 shrink-0" />
            </button>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      )}
    </div>
  );
}
