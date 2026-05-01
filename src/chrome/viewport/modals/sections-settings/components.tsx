import { Element } from "@craftjs/core";
import type { ReactNode } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TbChevronRight } from "react-icons/tb";
import type { BlockCategory } from "../../../../utils/useBlockCategories";
import type { BlockItem } from "../../../../utils/useCategoryBlocks";
import { ComponentPreview } from "../../../canvas/node-tools/ComponentPreview";
import { ToolboxInsertHintTooltip } from "../../../primitives/ToolboxInsertHintTooltip";
import { buildComponentFromNode } from "./blockHelpers";
import { CATEGORY_WIREFRAMES } from "./categoryWireframes";

export { FilterDropdown } from "../../../primitives/FilterDropdown";

export const BlockPreviewCard = memo(function BlockPreviewCard({
  block,
  resolver,
  onDoubleClick,
  onDragRef,
  onHover,
  onDismissQuickLook,
  quickLookOpen,
}: {
  block: BlockItem;
  resolver: any;
  onDoubleClick: () => void;
  onDragRef: (ref: any) => void;
  onHover?: (block: BlockItem, rect: DOMRect) => void;
  onDismissQuickLook?: () => void;
  quickLookOpen?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <ToolboxInsertHintTooltip>
      <div
        ref={ref => {
          (cardRef as any).current = ref;
          onDragRef(ref);
        }}
        onDoubleClick={onDoubleClick}
        onMouseEnter={() => {
          if (onHover && cardRef.current) {
            onHover(block, cardRef.current.getBoundingClientRect());
          }
        }}
        onMouseDown={onDismissQuickLook}
        className={`group border-base-300 bg-base-200 text-base-content hover:border-primary/50 relative flex cursor-grab flex-col overflow-hidden rounded-lg border hover:shadow-sm active:cursor-grabbing ${
          quickLookOpen ? "ring-primary/30 ring-2" : ""
        }`}
      >
        <div className="relative min-h-[7rem] flex-1 overflow-hidden">
          <ComponentPreview
            component={block.structure}
            modifiers={block.modifiers}
            slug={block.slug}
            scale={0.35}
            resolver={resolver}
          />
          <div className="bg-primary/10 pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <div className="border-base-300 bg-base-100 border-t px-2.5 py-2">
          <p className="text-base-content truncate text-xs font-medium">{block.name}</p>
        </div>
      </div>
    </ToolboxInsertHintTooltip>
  );
});

export const CustomSectionCard = memo(function CustomSectionCard({
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
    try {
      return buildComponentFromNode(template.rootNodeId, editorQuery);
    } catch {
      return null;
    }
  }, [template.rootNodeId, editorQuery]);

  const tool = <Element canvas is={"Container"} canDelete canEditName />;

  return (
    <ToolboxInsertHintTooltip>
      <div
        ref={(ref: any) => createRef(ref, tool)}
        className="group border-base-300 bg-base-200 text-base-content hover:border-primary/50 relative flex cursor-grab flex-col overflow-hidden rounded-lg border hover:shadow-sm active:cursor-grabbing"
        onDoubleClick={() => {
          try {
            const masterNode = editorQuery.node(template.rootNodeId).get();
            if (!masterNode) return;
            const uniquePrefix = `section-${Date.now()}`;
            const buildElement = (nodeId: string, index = 0): any => {
              const node = editorQuery.node(nodeId).get();
              if (!node) return null;
              const serializedNode = editorQuery.node(nodeId).toSerializedNode();
              const typeName =
                typeof serializedNode.type === "string"
                  ? serializedNode.type
                  : serializedNode.type?.resolvedName || "Container";
              const children = node.data.nodes
                .map((childId: string, childIndex: number) => buildElement(childId, childIndex))
                .filter(Boolean);
              return (
                <Element
                  key={`${uniquePrefix}-${index}`}
                  canvas={serializedNode.props.canvas}
                  is={typeName}
                  {...serializedNode.props}
                >
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
      >
        <div className="relative min-h-[7rem] flex-1 overflow-hidden">
          {customPreview && (
            <ComponentPreview component={customPreview} scale={0.35} resolver={resolver} />
          )}
          <kbd className="text-neutral-content/60 border-base-content/18 bg-base-200/95 absolute top-2 right-2 z-10 rounded-sm border border-dashed px-1 py-px font-mono text-[9px] leading-none tracking-normal">
            custom
          </kbd>
          <div className="bg-primary/10 pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <div className="border-base-300 bg-base-100 border-t px-2.5 py-2">
          <p className="text-base-content truncate text-xs font-medium">
            {template.name || "My block"}
          </p>
        </div>
      </div>
    </ToolboxInsertHintTooltip>
  );
});

export function CategoryCard({
  category,
  onClick,
  filteredCount,
}: {
  category: BlockCategory;
  onClick: () => void;
  /** When set (a style filter is active), shows `{filteredCount} of {total} blocks` and dims
   *  the card if `filteredCount === 0`. Omit when no filter is active. */
  filteredCount?: number | null;
}) {
  const wireframe = CATEGORY_WIREFRAMES[category.id];
  const hasSubcategories = category.subcategories.length > 0;
  const isFiltered = typeof filteredCount === "number";
  const dimmed = isFiltered && filteredCount === 0;

  return (
    <button
      onClick={onClick}
      className={`group border-base-300 bg-base-200 hover:border-primary flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border text-left hover:shadow-md ${
        dimmed ? "opacity-40" : ""
      }`}
    >
      <div className="bg-neutral/50 flex h-24 items-center justify-center overflow-hidden">
        {wireframe || <span className="text-neutral-content text-xs">{category.name}</span>}
      </div>
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="min-w-0">
          <div className="text-base-content text-sm font-medium">{category.name}</div>
          <div className="text-neutral-content text-xs">
            {isFiltered ? (
              <>
                {filteredCount} of {category.total} {category.total === 1 ? "block" : "blocks"}
              </>
            ) : (
              <>
                {category.total} {category.total === 1 ? "block" : "blocks"}
              </>
            )}
            {hasSubcategories && ` \u00b7 ${category.subcategories.length} types`}
          </div>
        </div>
        <TbChevronRight className="text-neutral-content size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

export function BlockQuickLook({
  block,
  resolver,
  originRect,
}: {
  block: BlockItem;
  resolver: any;
  originRect: DOMRect | null;
}) {
  const [animatedIn, setAnimatedIn] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setAnimatedIn(true));
  }, []);

  // Animate from card origin to center
  const originStyle = originRect
    ? {
        transformOrigin: `${originRect.left + originRect.width / 2}px ${originRect.top + originRect.height / 2}px`,
      }
    : {};

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="border-base-300 bg-base-100 pointer-events-auto max-h-[85vh] w-[min(900px,85vw)] overflow-y-auto rounded-xl border shadow-2xl transition-all duration-200 ease-out"
        style={{
          ...originStyle,
          opacity: animatedIn ? 1 : 0,
          transform: animatedIn ? "scale(1)" : "scale(0.92)",
        }}
      >
        <div className="border-base-300 bg-base-100/90 sticky top-0 z-20 flex items-center gap-2 border-b px-4 py-2 backdrop-blur-sm">
          <span className="text-base-content flex-1 text-sm font-medium">{block.name}</span>
          <kbd className="bg-base-200 text-neutral-content rounded px-1.5 py-0.5 text-[10px] font-medium">
            Space
          </kbd>
        </div>
        <div className="overflow-hidden">
          <ComponentPreview
            component={block.structure}
            modifiers={block.modifiers}
            slug={block.slug}
            scale={0.65}
            resolver={resolver}
          />
        </div>
      </div>
    </div>
  );
}
