import { Element } from "@craftjs/core";
import React from "react";
import type { BlockCategory } from "../../../utils/useBlockCategories";

/**
 * Reserved `cat` query value for user-saved blocks in the Blocks toolbox.
 * Must not be returned by `/api/v1/components/categories` (client-only virtual category).
 */
export const WORKSPACE_BLOCKS_CATEGORY_ID = "ph-workspace-blocks";

/** Virtual `BlockCategory` for URL-driven “My blocks” drill-in. */
export function buildWorkspaceBlockCategory(total: number): BlockCategory {
  return {
    id: WORKSPACE_BLOCKS_CATEGORY_ID,
    name: "My blocks",
    total,
    subcategories: [],
    styles: [],
  };
}

export const CATEGORY_ORDER = [
  "hero",
  "features",
  "content",
  "cta",
  "testimonials",
  "team",
  "pricing",
  "newsletter",
  "contact",
  "faq",
  "commerce",
  "navigation",
  "social-proof",
];

export function buildElementFromStructure(
  structure: any,
  key?: string,
  isPreview: boolean = false,
  resolver?: any
): any {
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

  return React.createElement(
    Element,
    { key: uniqueKey, canvas: true, is: Component, ...props },
    ...(children || [])
  );
}

export function buildComponentFromNode(nodeId: string, query: any): any {
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
}
