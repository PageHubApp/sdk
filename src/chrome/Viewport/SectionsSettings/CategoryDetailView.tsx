import { useEditor } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TbArrowLeft, TbChevronDown, TbChevronLeft, TbChevronRight, TbLoader2, TbX } from "react-icons/tb";
import { SectionPickerDialogAtom } from "utils/atoms";
import { useSetAtomState } from "../../../utils/atoms";
import type { BlockCategory } from "../../../utils/useBlockCategories";
import { useCategoryBlocks, type BlockItem } from "../../../utils/useCategoryBlocks";
import { useInsertTarget } from "../../hooks/useInsertTarget";
import { AutoHideScrollbar } from "../../shared/layout";
import { AddElement } from "../Toolbox/lib";
import { BlockPreviewCard, BlockQuickLook } from "./components";
import { buildElementFromStructure } from "./blockHelpers";

function FilterDropdown({
  label,
  activeValue,
  isOpen,
  onToggle,
  onClose,
  onClear,
  items,
  activeKey,
  onSelect,
}: {
  label: string;
  activeValue: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onClear: () => void;
  items: { name: string; count: number }[];
  activeKey: string | null;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="relative">
      {activeValue ? (
        <div className="flex items-center gap-1">
          <span className="bg-primary text-primary-content rounded-full px-2 py-0.5 text-xs font-medium">
            {activeValue}
          </span>
          <button
            onClick={onClear}
            className="rounded-full p-0.5 transition-colors hover:bg-neutral cursor-pointer"
          >
            <TbX className="size-3 text-neutral-content" />
          </button>
        </div>
      ) : (
        <button
          onClick={onToggle}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-neutral-content transition-colors hover:bg-neutral cursor-pointer"
        >
          {label}
          <TbChevronDown className={`size-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      )}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border border-base-300 bg-base-100 py-1 shadow-lg">
            {items.map(item => (
              <button
                key={item.name}
                onClick={() => onSelect(item.name)}
                className={`flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-xs transition-colors hover:bg-neutral ${
                  activeKey === item.name ? "text-primary font-medium" : "text-base-content"
                }`}
              >
                <span>{item.name.charAt(0).toUpperCase() + item.name.slice(1)}</span>
                <span className="text-neutral-content">{item.count}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface CategoryDetailViewProps {
  category: BlockCategory;
  categories: BlockCategory[];
  onBack: () => void;
  activeSubcategory: string | null;
  activeStyle: string | null;
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
  onSubcategoryChange,
  onStyleChange,
  onCategoryChange,
}: CategoryDetailViewProps) {
  const { actions, query } = useEditor();
  const { connectors: { create } } = useEditor(state => ({ enabled: state.options.enabled }));
  const resolver = useMemo(() => {
    try { return (query as any).getOptions?.()?.resolver ?? {}; } catch { return {}; }
  }, [query]);

  const positionInfo = useAtomValue(SectionPickerDialogAtom);
  const setPositionInfo = useSetAtomState(SectionPickerDialogAtom);
  const { getTargetPageId } = useInsertTarget();

  const { blocks, isLoading } = useCategoryBlocks(category.id, activeSubcategory, activeStyle);

  const containerRef = useRef<HTMLDivElement>(null);

  const currentIndex = categories.findIndex(c => c.id === category.id);
  const prevCategory = currentIndex > 0 ? categories[currentIndex - 1] : null;
  const nextCategory = currentIndex < categories.length - 1 ? categories[currentIndex + 1] : null;

  const insertElement = useCallback((element: any) => {
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
  }, [actions, query, positionInfo, setPositionInfo, getTargetPageId]);

  const handleDoubleClick = useCallback((block: BlockItem) => {
    const element = buildElementFromStructure(block.structure, block.slug, false, resolver);
    insertElement(element);
  }, [resolver, insertElement]);

  const [filterOpen, setFilterOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [quickLookBlock, setQuickLookBlock] = useState<BlockItem | null>(null);
  const [quickLookRect, setQuickLookRect] = useState<DOMRect | null>(null);
  const [isHoveringCard, setIsHoveringCard] = useState(false);
  const hoveredRef = useRef<{ block: BlockItem; rect: DOMRect } | null>(null);
  const hasSubcategories = category.subcategories.length > 0;
  const hasStyles = category.styles?.length > 0;

  const hasUsedQuickLook = useRef(false);

  const handleBlockHover = useCallback((block: BlockItem, rect: DOMRect) => {
    hoveredRef.current = { block, rect };
    setIsHoveringCard(true);
    if (quickLookBlock) {
      setQuickLookBlock(block);
      setQuickLookRect(rect);
    }
  }, [quickLookBlock]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === " " && !e.repeat && !(e.target as HTMLElement)?.closest("input, textarea, [contenteditable]")) {
        e.preventDefault();
        if (quickLookBlock) {
          setQuickLookBlock(null);
          setQuickLookRect(null);
        } else if (hoveredRef.current) {
          setQuickLookBlock(hoveredRef.current.block);
          setQuickLookRect(hoveredRef.current.rect);
          hasUsedQuickLook.current = true;
        }
      }
      if (e.key === "Escape" && quickLookBlock) {
        setQuickLookBlock(null);
        setQuickLookRect(null);
      }
    };
    window.addEventListener("keydown", handleKey, { capture: true });
    return () => window.removeEventListener("keydown", handleKey, { capture: true });
  }, [quickLookBlock]);

  const activeLabel = activeSubcategory
    ? `${activeSubcategory.charAt(0).toUpperCase() + activeSubcategory.slice(1)}`
    : null;
  const styleLabel = activeStyle
    ? `${activeStyle.charAt(0).toUpperCase() + activeStyle.slice(1)}`
    : null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-base-300 px-3 py-4">
        <button onClick={onBack} className="rounded-md p-1 transition-colors hover:bg-neutral cursor-pointer">
          <TbArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <div className="text-sm font-medium">{category.name}</div>
          <span className="text-xs text-neutral-content">{category.total}</span>
        </div>

        {/* Style dropdown */}
        {hasStyles && (
          <FilterDropdown
            label="Style"
            activeValue={styleLabel}
            isOpen={styleOpen}
            onToggle={() => { setStyleOpen(!styleOpen); setFilterOpen(false); }}
            onClose={() => setStyleOpen(false)}
            onClear={() => onStyleChange(null)}
            items={category.styles}
            activeKey={activeStyle}
            onSelect={(name) => { onStyleChange(name); setStyleOpen(false); }}
          />
        )}

        {/* Filter dropdown */}
        {hasSubcategories && (
          <FilterDropdown
            label="Filter"
            activeValue={activeLabel}
            isOpen={filterOpen}
            onToggle={() => { setFilterOpen(!filterOpen); setStyleOpen(false); }}
            onClose={() => setFilterOpen(false)}
            onClear={() => onSubcategoryChange(null)}
            items={category.subcategories}
            activeKey={activeSubcategory}
            onSelect={(name) => { onSubcategoryChange(name); setFilterOpen(false); }}
          />
        )}
      </div>

      {/* Block list */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <TbLoader2 className="size-5 animate-spin text-neutral-content" />
        </div>
      ) : (
        <AutoHideScrollbar className="flex-1" ref={containerRef}>
          <div className="grid w-full grid-cols-1 gap-3 p-3 pt-1" onMouseLeave={() => setIsHoveringCard(false)}>
            {blocks.map(block => (
              <BlockPreviewCard
                key={block.slug || block._id}
                block={block}
                resolver={resolver}
                onDoubleClick={() => handleDoubleClick(block)}
                onDragRef={(ref) => {
                  if (!ref) return;
                  ref.setAttribute("data-create-type", "section");
                  const tool = buildElementFromStructure(block.structure, block.slug, false, resolver);
                  if (tool) create(ref, tool);
                }}
                onHover={handleBlockHover}
                onDismissQuickLook={() => { setQuickLookBlock(null); setQuickLookRect(null); }}
                quickLookOpen={quickLookBlock?.slug === block.slug}
              />
            ))}
          </div>
          {blocks.length === 0 && (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-neutral-content">No blocks in this category.</p>
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
        <div className={`pointer-events-none absolute inset-x-0 bottom-14 z-50 flex justify-center transition-opacity duration-300 ${isHoveringCard ? "opacity-100" : "opacity-0"}`}>
          <div className="rounded-md bg-base-300 px-2.5 py-1 text-[11px] text-base-content shadow-lg whitespace-nowrap">
            <kbd className="mr-1 rounded bg-base-100 px-1 py-0.5 font-mono text-[10px]">Space</kbd>
            to preview
          </div>
        </div>
      )}

      {/* Prev / Next category nav */}
      {(prevCategory || nextCategory) && (
        <div className="flex items-stretch border-t border-base-300">
          {prevCategory ? (
            <button
              onClick={() => onCategoryChange(prevCategory.id)}
              className="flex flex-1 cursor-pointer items-center gap-1.5 px-3 py-4 text-left transition-colors hover:bg-neutral"
            >
              <TbChevronLeft className="size-3.5 shrink-0 text-neutral-content" />
              <span className="min-w-0 truncate text-xs font-medium text-neutral-content">{prevCategory.name}</span>
            </button>
          ) : (
            <div className="flex-1" />
          )}
          {prevCategory && nextCategory && (
            <div className="w-px bg-border" />
          )}
          {nextCategory ? (
            <button
              onClick={() => onCategoryChange(nextCategory.id)}
              className="flex flex-1 cursor-pointer items-center justify-end gap-1.5 px-3 py-4 text-right transition-colors hover:bg-neutral"
            >
              <span className="min-w-0 truncate text-xs font-medium text-neutral-content">{nextCategory.name}</span>
              <TbChevronRight className="size-3.5 shrink-0 text-neutral-content" />
            </button>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      )}
    </div>
  );
}
