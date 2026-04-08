import { useEditor } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import React, { useCallback, useMemo, useRef } from "react";
import { TbArrowLeft, TbChevronLeft, TbChevronRight, TbLoader2 } from "react-icons/tb";
import { SectionPickerDialogAtom } from "utils/atoms";
import { useSetAtomState } from "../../../utils/atoms";
import type { BlockCategory } from "../../../utils/useBlockCategories";
import { useCategoryBlocks, type BlockItem } from "../../../utils/useCategoryBlocks";
import { useInsertTarget } from "../../hooks/useInsertTarget";
import { AutoHideScrollbar } from "../../shared/layout";
import { AddElement } from "../Toolbox/lib";
import { BlockPreviewCard, SubcategoryChip } from "./components";
import { buildElementFromStructure } from "./blockHelpers";

interface CategoryDetailViewProps {
  category: BlockCategory;
  categories: BlockCategory[];
  onBack: () => void;
  activeSubcategory: string | null;
  onSubcategoryChange: (sub: string | null) => void;
  onCategoryChange: (catId: string) => void;
}

export function CategoryDetailView({
  category,
  categories,
  onBack,
  activeSubcategory,
  onSubcategoryChange,
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

  const { blocks, isLoading } = useCategoryBlocks(category.id, activeSubcategory);

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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-base-300 px-3 py-2.5">
        <button onClick={onBack} className="rounded-md p-1 transition-colors hover:bg-neutral cursor-pointer">
          <TbArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{category.name}</div>
          <div className="text-xs text-neutral-content">{category.total} blocks</div>
        </div>
      </div>

      {/* Subcategory chips */}
      {category.subcategories.length > 0 && (
        <div
          className="flex gap-1.5 overflow-x-auto px-3 py-2"
          style={{ scrollbarWidth: "none" }}
        >
          <SubcategoryChip
            name="All"
            count={category.total}
            active={activeSubcategory === null}
            onClick={() => onSubcategoryChange(null)}
          />
          {category.subcategories.map(sub => (
            <SubcategoryChip
              key={sub.name}
              name={sub.name}
              count={sub.count}
              active={activeSubcategory === sub.name}
              onClick={() => onSubcategoryChange(sub.name)}
            />
          ))}
        </div>
      )}

      {/* Block list */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <TbLoader2 className="size-5 animate-spin text-neutral-content" />
        </div>
      ) : (
        <AutoHideScrollbar className="flex-1" ref={containerRef}>
          <div className="grid w-full grid-cols-1 gap-3 p-3 pt-1">
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

      {/* Prev / Next category nav */}
      {(prevCategory || nextCategory) && (
        <div className="flex items-stretch border-t border-base-300">
          {prevCategory ? (
            <button
              onClick={() => onCategoryChange(prevCategory.id)}
              className="flex flex-1 cursor-pointer items-center gap-1.5 px-3 py-2.5 text-left transition-colors hover:bg-neutral"
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
              className="flex flex-1 cursor-pointer items-center justify-end gap-1.5 px-3 py-2.5 text-right transition-colors hover:bg-neutral"
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
