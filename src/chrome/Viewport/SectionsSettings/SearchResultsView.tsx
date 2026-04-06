import { useEditor } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import React, { useCallback, useMemo } from "react";
import { TbLoader2 } from "react-icons/tb";
import { SectionPickerDialogAtom } from "utils/atoms";
import { useSetAtomState } from "../../../utils/atoms";
import { useBlockSearch, type BlockItem } from "../../../utils/useCategoryBlocks";
import { useInsertTarget } from "../../hooks/useInsertTarget";
import { AutoHideScrollbar } from "../../shared/layout";
import { AddElement } from "../Toolbox/lib";
import { BlockPreviewCard } from "./components";
import { buildElementFromStructure } from "./blockHelpers";

export function SearchResultsView({ query: searchQuery }: { query: string }) {
  const { actions, query: editorQuery } = useEditor();
  const { connectors: { create } } = useEditor(state => ({ enabled: state.options.enabled }));
  const resolver = useMemo(() => {
    try { return (editorQuery as any).getOptions?.()?.resolver ?? {}; } catch { return {}; }
  }, [editorQuery]);

  const positionInfo = useAtomValue(SectionPickerDialogAtom);
  const setPositionInfo = useSetAtomState(SectionPickerDialogAtom);
  const { getTargetPageId } = useInsertTarget();

  const { blocks, isLoading } = useBlockSearch(searchQuery);

  const insertElement = useCallback((element: any) => {
    if (!element) return;
    if (positionInfo.nodeId && positionInfo.parent) {
      const parentNodeData = editorQuery.node(positionInfo.parent).get();
      const currentIndex = parentNodeData.data.nodes.indexOf(positionInfo.nodeId);
      const newIndex = positionInfo.position === "bottom" ? currentIndex + 1 : currentIndex;
      AddElement({ element, actions, query: editorQuery, addTo: positionInfo.parent, index: newIndex });
      setPositionInfo({ isOpen: false, nodeId: null, position: null, parent: null });
    } else {
      const targetPageId = getTargetPageId();
      AddElement({ element, actions, query: editorQuery, addTo: targetPageId });
    }
  }, [actions, editorQuery, positionInfo, setPositionInfo, getTargetPageId]);

  // Group results by category
  const grouped = useMemo(() => {
    const map: Record<string, BlockItem[]> = {};
    for (const block of blocks) {
      const cat = block.category || "uncategorized";
      if (!map[cat]) map[cat] = [];
      map[cat].push(block);
    }
    return map;
  }, [blocks]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <TbLoader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">No blocks found for &ldquo;{searchQuery}&rdquo;</p>
      </div>
    );
  }

  return (
    <AutoHideScrollbar className="flex-1">
      <div className="p-3 pt-1">
        {Object.entries(grouped).map(([cat, catBlocks]) => (
          <div key={cat} className="mb-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {cat} ({catBlocks.length})
            </div>
            <div className="grid w-full grid-cols-1 gap-3">
              {catBlocks.map(block => (
                <BlockPreviewCard
                  key={block.slug || block._id}
                  block={block}
                  resolver={resolver}
                  onDoubleClick={() => {
                    const element = buildElementFromStructure(block.structure, block.slug, false, resolver);
                    insertElement(element);
                  }}
                  onDragRef={(ref) => {
                    if (!ref) return;
                    ref.setAttribute("data-create-type", "section");
                    const tool = buildElementFromStructure(block.structure, block.slug, false, resolver);
                    if (tool) create(ref, tool);
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="shrink-0" style={{ minHeight: "70vh" }} />
    </AutoHideScrollbar>
  );
}
