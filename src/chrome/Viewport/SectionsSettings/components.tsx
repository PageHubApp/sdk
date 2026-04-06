import { Element } from "@craftjs/core";
import { memo, useMemo } from "react";
import { TbChevronRight } from "react-icons/tb";
import type { BlockCategory } from "../../../utils/useBlockCategories";
import type { BlockItem } from "../../../utils/useCategoryBlocks";
import { ComponentPreview } from "../../NodeControllers/Tools/ComponentPreview";
import { buildComponentFromNode } from "./blockHelpers";
import { CATEGORY_WIREFRAMES } from "./categoryWireframes";

export const BlockPreviewCard = memo(function BlockPreviewCard({
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
    <div

      ref={onDragRef}
      onDoubleClick={onDoubleClick}
      className="group border-border bg-card text-card-foreground hover:border-primary/50 relative cursor-pointer overflow-hidden rounded-lg border transition-all hover:shadow-sm"
    >
      <ComponentPreview component={block.structure} scale={0.2} resolver={resolver} />
      <div className="bg-primary/10 absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="border-border border-t px-2.5 py-1.5">
        <span className="text-muted-foreground text-xs font-medium">{block.name}</span>
      </div>
    </div>
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
    <div

      ref={(ref: any) => createRef(ref, tool)}
      className="group border-border bg-card text-card-foreground hover:border-primary/50 relative cursor-pointer overflow-hidden rounded-lg border transition-all hover:shadow-sm"
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
      {customPreview && (
        <ComponentPreview component={customPreview} scale={0.2} resolver={resolver} />
      )}
      <div className="bg-primary absolute top-2 right-2 z-10 rounded-lg px-2 py-1">
        <span className="text-primary-foreground text-xs font-medium">Custom</span>
      </div>
      <div className="bg-primary/10 absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="border-border border-t px-2.5 py-1.5">
        <span className="text-muted-foreground text-xs font-medium">{template.name}</span>
      </div>
    </div>
  );
});

export function CategoryCard({
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
      className="group border-border bg-card hover:border-primary flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border text-left transition-all hover:shadow-md"
    >
      <div className="bg-muted/50 flex h-24 items-center justify-center overflow-hidden">
        {wireframe || <span className="text-muted-foreground text-xs">{category.name}</span>}
      </div>
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="min-w-0">
          <div className="text-card-foreground text-sm font-medium">{category.name}</div>
          <div className="text-muted-foreground text-xs">
            {category.total} {category.total === 1 ? "block" : "blocks"}
            {hasSubcategories && ` \u00b7 ${category.subcategories.length} types`}
          </div>
        </div>
        <TbChevronRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

export function SubcategoryChip({
  name,
  count,
  active,
  onClick,
}: {
  name: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      {name.charAt(0).toUpperCase() + name.slice(1)} ({count})
    </button>
  );
}
