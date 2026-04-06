// @ts-nocheck
import { Element, useEditor } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { motion } from "framer-motion";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TbArrowLeft, TbChevronRight, TbLoader2, TbSearch } from "react-icons/tb";
import { SectionPickerDialogAtom } from "utils/atoms";
import { ComponentsAtom } from "utils/lib";
import { useSetAtomState } from "../../utils/atoms";
import { useBlockCategories, type BlockCategory } from "../../utils/useBlockCategories";
import { useCategoryBlocks, useBlockSearch, type BlockItem } from "../../utils/useCategoryBlocks";
import { useInsertTarget } from "../hooks/useInsertTarget";
import { ComponentPreview } from "../NodeControllers/Tools/ComponentPreview";
import { AutoHideScrollbar } from "../shared/layout";
import { AddElement } from "./Toolbox/lib";

// ── Category wireframe SVGs (lightweight visual previews) ─────────────────────

const c = {
  line: "var(--border, #e2e8f0)",
  block: "var(--muted, #f1f5f9)",
  accent: "var(--primary, #3b82f6)",
  dark: "var(--muted-foreground, #64748b)",
};

const CATEGORY_WIREFRAMES: Record<string, React.ReactNode> = {
  hero: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <rect x="80" y="30" width="160" height="10" rx="3" fill={c.dark} />
      <rect x="60" y="48" width="200" height="10" rx="3" fill={c.dark} />
      <rect x="90" y="70" width="140" height="6" rx="2" fill={c.line} />
      <rect x="105" y="82" width="110" height="6" rx="2" fill={c.line} />
      <rect x="88" y="102" width="64" height="22" rx="11" fill={c.accent} />
      <rect x="162" y="102" width="64" height="22" rx="11" stroke={c.dark} strokeWidth="1.5" />
    </svg>
  ),
  features: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      {[40, 130, 220].map(x => (
        <g key={x}>
          <rect x={x} y="24" width="28" height="28" rx="8" fill={c.accent} opacity="0.2" />
          <rect x={x + 6} y="32" width="16" height="12" rx="2" fill={c.accent} />
          <rect x={x - 4} y="62" width="68" height="7" rx="2" fill={c.dark} />
          <rect x={x - 4} y="76" width="68" height="5" rx="2" fill={c.line} />
          <rect x={x - 4} y="86" width="52" height="5" rx="2" fill={c.line} />
        </g>
      ))}
    </svg>
  ),
  content: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <rect x="24" y="24" width="130" height="132" rx="8" fill={c.block} />
      <polygon points="54,120 89,70 124,120" fill={c.line} />
      <circle cx="70" cy="60" r="12" fill={c.line} />
      <rect x="174" y="36" width="50" height="5" rx="2" fill={c.accent} />
      <rect x="174" y="52" width="120" height="8" rx="2" fill={c.dark} />
      <rect x="174" y="66" width="100" height="8" rx="2" fill={c.dark} />
      <rect x="174" y="86" width="120" height="5" rx="2" fill={c.line} />
      <rect x="174" y="96" width="110" height="5" rx="2" fill={c.line} />
      <rect x="174" y="106" width="90" height="5" rx="2" fill={c.line} />
      <rect x="174" y="124" width="70" height="20" rx="10" fill={c.accent} />
    </svg>
  ),
  newsletter: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <rect x="40" y="28" width="240" height="10" rx="3" fill={c.dark} />
      <rect x="56" y="46" width="208" height="6" rx="2" fill={c.line} />
      <rect x="72" y="58" width="176" height="6" rx="2" fill={c.line} />
      <rect x="40" y="82" width="240" height="36" rx="8" fill="white" stroke={c.line} strokeWidth="1" />
      <rect x="52" y="94" width="16" height="12" rx="2" fill={c.line} />
      <rect x="76" y="97" width="100" height="6" rx="2" fill={c.block} />
      <rect x="188" y="82" width="92" height="36" fill={c.accent} />
      <rect x="210" y="97" width="48" height="6" rx="2" fill="white" opacity="0.95" />
    </svg>
  ),
  testimonials: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <text x="130" y="50" fontSize="48" fill={c.block} fontFamily="Georgia">&ldquo;</text>
      <rect x="70" y="64" width="180" height="6" rx="2" fill={c.line} />
      <rect x="85" y="78" width="150" height="6" rx="2" fill={c.line} />
      <rect x="95" y="92" width="130" height="6" rx="2" fill={c.line} />
      <rect x="140" y="110" width="40" height="2" rx="1" fill={c.block} />
      <circle cx="140" cy="132" r="12" fill={c.accent} opacity="0.2" />
      <rect x="158" y="126" width="50" height="6" rx="2" fill={c.dark} />
      <rect x="158" y="136" width="36" height="5" rx="2" fill={c.line} />
    </svg>
  ),
  team: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      {[32, 122, 212].map(x => (
        <g key={x}>
          <rect x={x} y="20" width="76" height="140" rx="8" fill={c.block} />
          <rect x={x} y="20" width="76" height="70" rx="8" fill={c.line} />
          <rect x={x} y="82" width="76" height="8" rx="0" fill={c.block} />
          <rect x={x + 12} y="100" width="52" height="7" rx="2" fill={c.dark} />
          <rect x={x + 18} y="114" width="40" height="5" rx="2" fill={c.line} />
        </g>
      ))}
    </svg>
  ),
  pricing: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <rect x="72" y="10" width="176" height="8" rx="2" fill={c.dark} />
      <rect x="96" y="24" width="128" height="5" rx="2" fill={c.line} />
      {[28, 118, 208].map((x, i) => (
        <g key={x}>
          <rect x={x} y="40" width="84" height="128" rx="8" fill={c.block} stroke={i === 1 ? c.accent : c.line} strokeWidth={i === 1 ? 2 : 1} />
          <rect x={x + 24} y="50" width="36" height="5" rx="2" fill={c.dark} />
          <rect x={x + 12} y="60" width="60" height="4" rx="1" fill={c.line} />
          <rect x={x + 20} y="72" width="44" height="10" rx="2" fill={c.dark} />
          <rect x={x + 12} y="88" width="60" height="3" rx="1" fill={c.line} />
          <rect x={x + 12} y="96" width="56" height="3" rx="1" fill={c.line} />
          <rect x={x + 10} y="118" width="64" height="16" rx="8" fill={c.accent} />
        </g>
      ))}
    </svg>
  ),
  contact: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <rect x="60" y="16" width="200" height="148" rx="10" fill={c.block} />
      <rect x="80" y="30" width="50" height="4" rx="2" fill={c.accent} />
      <rect x="80" y="40" width="100" height="8" rx="2" fill={c.dark} />
      <rect x="80" y="58" width="160" height="18" rx="4" fill="white" stroke={c.line} strokeWidth="1" />
      <rect x="80" y="82" width="160" height="18" rx="4" fill="white" stroke={c.line} strokeWidth="1" />
      <rect x="80" y="106" width="160" height="28" rx="4" fill="white" stroke={c.line} strokeWidth="1" />
      <rect x="80" y="140" width="160" height="18" rx="9" fill={c.accent} />
    </svg>
  ),
  cta: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <rect x="24" y="24" width="272" height="132" rx="12" fill={c.accent} opacity="0.15" />
      <rect x="80" y="46" width="160" height="10" rx="3" fill={c.dark} />
      <rect x="95" y="64" width="130" height="6" rx="2" fill={c.line} />
      <rect x="105" y="76" width="110" height="6" rx="2" fill={c.line} />
      <rect x="100" y="100" width="56" height="22" rx="11" fill={c.accent} />
      <rect x="164" y="100" width="56" height="22" rx="11" stroke={c.dark} strokeWidth="1.5" />
    </svg>
  ),
  faq: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      {[24, 72, 120].map((y, i) => (
        <g key={y}>
          <rect x="40" y={y} width="180" height="7" rx="2" fill={c.dark} />
          <rect x="40" y={y + 14} width="240" height="5" rx="2" fill={c.line} />
          <rect x="40" y={y + 24} width="200" height="5" rx="2" fill={c.line} />
          {i < 2 && <line x1="40" y1={y + 40} x2="280" y2={y + 40} stroke={c.block} strokeWidth="1" />}
        </g>
      ))}
    </svg>
  ),
  commerce: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <rect x="90" y="12" width="140" height="156" rx="10" fill={c.block} />
      <rect x="90" y="12" width="140" height="80" rx="10" fill={c.line} />
      <rect x="90" y="85" width="140" height="7" rx="0" fill={c.block} />
      <rect x="106" y="102" width="80" height="7" rx="2" fill={c.dark} />
      <rect x="106" y="116" width="44" height="7" rx="2" fill={c.accent} />
      <rect x="106" y="134" width="108" height="20" rx="10" fill={c.accent} />
    </svg>
  ),
  "social-proof": (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <rect x="40" y="36" width="56" height="16" rx="3" fill={c.dark} />
      <rect x="40" y="58" width="72" height="6" rx="2" fill={c.line} />
      <rect x="132" y="36" width="56" height="16" rx="3" fill={c.dark} />
      <rect x="132" y="58" width="72" height="6" rx="2" fill={c.line} />
      <rect x="224" y="36" width="56" height="16" rx="3" fill={c.dark} />
      <rect x="224" y="58" width="72" height="6" rx="2" fill={c.line} />
      <rect x="72" y="108" width="176" height="8" rx="2" fill={c.line} />
      {[88, 132, 176, 220].map(x => (
        <circle key={x} cx={x} cy="142" r="10" fill={c.block} stroke={c.line} strokeWidth="1" />
      ))}
    </svg>
  ),
  navigation: (
    <svg viewBox="0 0 320 180" fill="none" className="h-full w-full">
      <rect x="24" y="24" width="272" height="36" rx="6" fill={c.block} />
      <rect x="36" y="34" width="50" height="8" rx="2" fill={c.dark} />
      <rect x="196" y="36" width="28" height="5" rx="2" fill={c.line} />
      <rect x="232" y="36" width="28" height="5" rx="2" fill={c.line} />
      <rect x="268" y="34" width="18" height="8" rx="2" fill={c.accent} />
      <rect x="24" y="100" width="272" height="60" rx="6" fill={c.dark} />
      <rect x="120" y="112" width="80" height="7" rx="2" fill={c.block} />
      <rect x="100" y="126" width="120" height="5" rx="2" fill={c.line} />
      <rect x="128" y="142" width="24" height="4" rx="2" fill={c.line} />
      <rect x="158" y="142" width="24" height="4" rx="2" fill={c.line} />
    </svg>
  ),
};

const CATEGORY_ORDER = [
  "hero", "features", "content", "cta", "testimonials", "team",
  "pricing", "newsletter", "contact", "faq", "commerce", "navigation", "social-proof",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const buildElementFromStructure = (
  structure: any,
  key?: string,
  isPreview: boolean = false,
  resolver?: any
): any => {
  const Component = resolver ? resolver[structure.type] : null;
  if (!Component) return null;

  const previewPrefix = isPreview ? "preview-" : "";
  const uniqueKey = `${previewPrefix}${key || "root"}`;

  const children = structure.children?.map((child: any, index: number) =>
    buildElementFromStructure(child, `${uniqueKey}-${index}`, isPreview, resolver)
  );

  const props = isPreview
    ? {
      ...structure.props,
      className:
        structure.props.className?.replace?.(/py-\d+/g, "py-2").replace?.(/p-\d+/g, "p-2") ||
        undefined,
    }
    : structure.props;

  return (
    <Element key={uniqueKey} canvas is={Component} {...props}>
      {children}
    </Element>
  );
};

const buildComponentFromNode = (nodeId: string, query: any): any => {
  try {
    const node = query.node(nodeId).get();
    if (!node) return null;
    const serialized = query.node(nodeId).toSerializedNode();
    const typeName =
      typeof serialized.type === "string" ? serialized.type : serialized.type?.resolvedName;
    return {
      type: typeName || "Container",
      props: serialized.props,
      children: node.data.nodes
        .map((childId: string) => buildComponentFromNode(childId, query))
        .filter(Boolean),
    };
  } catch {
    return null;
  }
};

// ── Memoized block preview card ──────────────────────────────────────────────

const BlockPreviewCard = memo(function BlockPreviewCard({
  block,
  resolver,
  onDoubleClick,
  onDragRef,
}: {
  block: BlockItem;
  resolver: any;
  onDoubleClick: () => void;
  onDragRef: (ref: any) => void;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      ref={onDragRef}
      onDoubleClick={onDoubleClick}
      style={{ willChange: "transform", backfaceVisibility: "hidden" }}
      className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-all hover:border-primary/50 hover:shadow-sm"
    >
      <ComponentPreview component={block.structure} scale={0.2} resolver={resolver} />
      <div className="absolute inset-0 bg-primary/10 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="border-t border-border px-2.5 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">{block.name}</span>
      </div>
    </motion.div>
  );
});

// ── Custom section card (same look, different data source) ───────────────────

const CustomSectionCard = memo(function CustomSectionCard({
  template,
  resolver,
  query: editorQuery,
  onInsert,
  createRef,
}: {
  template: any;
  resolver: any;
  query: any;
  onInsert: (element: any) => void;
  createRef: (ref: any, tool: any) => void;
}) {
  const customPreview = useMemo(() => {
    if (!template.rootNodeId) return null;
    try { return buildComponentFromNode(template.rootNodeId, editorQuery); } catch { return null; }
  }, [template.rootNodeId, editorQuery]);

  const tool = (
    <Element canvas is={"Container"} canDelete canEditName />
  );

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      ref={(ref: any) => createRef(ref, tool)}
      onDoubleClick={() => {
        try {
          const masterNode = editorQuery.node(template.rootNodeId).get();
          if (!masterNode) return;
          const uniquePrefix = `section-${Date.now()}`;
          const buildElement = (nodeId, index = 0) => {
            const node = editorQuery.node(nodeId).get();
            if (!node) return null;
            const serializedNode = editorQuery.node(nodeId).toSerializedNode();
            const typeName =
              typeof serializedNode.type === "string"
                ? serializedNode.type
                : serializedNode.type?.resolvedName || "Container";
            const children = node.data.nodes
              .map((childId, childIndex) => buildElement(childId, childIndex))
              .filter(Boolean);
            return (
              <Element key={`${uniquePrefix}-${index}`} canvas={serializedNode.props.canvas} is={typeName} {...serializedNode.props}>
                {children}
              </Element>
            );
          };
          const element = buildElement(template.rootNodeId);
          if (element) onInsert(element);
        } catch (e) {
          console.error("Error creating custom section:", e);
        }
      }}
      style={{ willChange: "transform", backfaceVisibility: "hidden" }}
      className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-card text-card-foreground transition-all hover:border-primary/50 hover:shadow-sm"
    >
      {customPreview && <ComponentPreview component={customPreview} scale={0.2} resolver={resolver} />}
      <div className="absolute right-2 top-2 z-10 rounded-lg bg-primary px-2 py-1">
        <span className="text-xs font-medium text-primary-foreground">Custom</span>
      </div>
      <div className="absolute inset-0 bg-primary/10 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="border-t border-border px-2.5 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">{template.name}</span>
      </div>
    </motion.div>
  );
});

// ── Category card for the grid view ──────────────────────────────────────────

const CategoryCard = memo(function CategoryCard({
  category,
  onClick,
}: {
  category: BlockCategory;
  onClick: () => void;
}) {
  const wireframe = CATEGORY_WIREFRAMES[category.id];
  const hasSubcategories = category.subcategories.length > 0;

  return (
    <button
      onClick={onClick}
      className="group flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary hover:shadow-md"
    >
      <div className="flex h-24 items-center justify-center overflow-hidden bg-muted/50">
        {wireframe || (
          <span className="text-xs text-muted-foreground">{category.name}</span>
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="min-w-0">
          <div className="text-sm font-medium text-card-foreground">{category.name}</div>
          <div className="text-xs text-muted-foreground">
            {category.total} {category.total === 1 ? "block" : "blocks"}
            {hasSubcategories && ` \u00b7 ${category.subcategories.length} types`}
          </div>
        </div>
        <TbChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
});

// ── Subcategory chip ─────────────────────────────────────────────────────────

const SubcategoryChip = ({ name, count, active, onClick }: {
  name: string; count: number; active: boolean; onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`cursor-pointer whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
      active
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    }`}
  >
    {name.charAt(0).toUpperCase() + name.slice(1)} ({count})
  </button>
);

// ── Category detail view (drill-in) ─────────────────────────────────────────

const CategoryDetailView = ({
  category,
  onBack,
}: {
  category: BlockCategory;
  onBack: () => void;
}) => {
  const { actions, query } = useEditor();
  const { connectors: { create } } = useEditor(state => ({ enabled: state.options.enabled }));
  const resolver = useMemo(() => {
    try { return (query as any).getOptions?.()?.resolver ?? {}; } catch { return {}; }
  }, [query]);

  const positionInfo = useAtomValue(SectionPickerDialogAtom);
  const setPositionInfo = useSetAtomState(SectionPickerDialogAtom);
  const { getTargetPageId } = useInsertTarget();

  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const { blocks, isLoading } = useCategoryBlocks(category.id, activeSubcategory);

  const containerRef = useRef<HTMLDivElement>(null);

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
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <button onClick={onBack} className="rounded-md p-1 transition-colors hover:bg-muted cursor-pointer">
          <TbArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{category.name}</div>
          <div className="text-xs text-muted-foreground">{category.total} blocks</div>
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
            onClick={() => setActiveSubcategory(null)}
          />
          {category.subcategories.map(sub => (
            <SubcategoryChip
              key={sub.name}
              name={sub.name}
              count={sub.count}
              active={activeSubcategory === sub.name}
              onClick={() => setActiveSubcategory(sub.name)}
            />
          ))}
        </div>
      )}

      {/* Block list */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <TbLoader2 className="size-5 animate-spin text-muted-foreground" />
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
                  const tool = buildElementFromStructure(block.structure, block.slug, false, resolver);
                  if (tool) create(ref, tool);
                }}
              />
            ))}
          </div>
          {blocks.length === 0 && (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">No blocks in this category.</p>
            </div>
          )}
        </AutoHideScrollbar>
      )}
    </div>
  );
};

// ── Search results view ──────────────────────────────────────────────────────

const SearchResultsView = ({ query: searchQuery }: { query: string }) => {
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
                    const tool = buildElementFromStructure(block.structure, block.slug, false, resolver);
                    if (tool) create(ref, tool);
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </AutoHideScrollbar>
  );
};

// ── Main component ───────────────────────────────────────────────────────────

export const SectionsSettings = () => {
  const { query } = useEditor();
  const { categories, isLoading } = useBlockCategories();
  const components = useAtomValue(ComponentsAtom);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<BlockCategory | null>(null);
  const focusRef = useRef(null);

  const isSearchMode = search.trim().length >= 2;

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

  useEffect(() => {
    const time = setTimeout(() => focusRef?.current?.focus(), 50);
    return () => clearTimeout(time);
  }, []);

  // When entering search mode, deselect category
  useEffect(() => {
    if (isSearchMode) setSelectedCategory(null);
  }, [isSearchMode]);

  // Category drill-in view
  if (selectedCategory && !isSearchMode) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <CategoryDetailView
          category={selectedCategory}
          onBack={() => setSelectedCategory(null)}
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
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Search results */}
      {isSearchMode ? (
        <SearchResultsView query={search} />
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
                    onClick={() => setSelectedCategory(cat)}
                  />
                ))}
              </div>
            )}
          </div>
        </AutoHideScrollbar>
      )}
    </div>
  );
};

// ── Custom sections grid (from current page) ────────────────────────────────

const CustomSectionsGrid = ({ sections }: { sections: any[] }) => {
  const { actions, query } = useEditor();
  const { connectors: { create } } = useEditor(state => ({ enabled: state.options.enabled }));
  const resolver = useMemo(() => {
    try { return (query as any).getOptions?.()?.resolver ?? {}; } catch { return {}; }
  }, [query]);

  const positionInfo = useAtomValue(SectionPickerDialogAtom);
  const setPositionInfo = useSetAtomState(SectionPickerDialogAtom);
  const { getTargetPageId } = useInsertTarget();

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

  return (
    <div className="grid w-full grid-cols-1 gap-3">
      {sections.map(template => (
        <CustomSectionCard
          key={template.id}
          template={template}
          resolver={resolver}
          query={query}
          onInsert={insertElement}
          createRef={create}
        />
      ))}
    </div>
  );
};
