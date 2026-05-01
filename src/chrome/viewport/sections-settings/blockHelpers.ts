import React from "react";
import type { BlockCategory } from "../../../utils/useBlockCategories";
import type { BlockItem } from "../../../utils/useCategoryBlocks";
import { buildCraftTreeFromStructure } from "../../buildCraftTreeFromStructure";

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

export type BuildElementFromStructureOpts = {
  /** Merged into ROOT on insert (one undo step); stored on root `custom` until consumed. */
  pendingBlockModifiers?: BlockItem["modifiers"];
};

export function buildElementFromStructure(
  structure: any,
  key?: string,
  isPreview: boolean = false,
  resolver?: any,
  opts?: BuildElementFromStructureOpts
): any {
  if (!resolver) return null;
  const previewPrefix = isPreview ? "preview-" : "";
  const uniqueKey = `${previewPrefix}${key || "root"}`;
  return buildCraftTreeFromStructure(structure, {
    mode: "toolbox",
    resolver,
    uniqueKey,
    isPreview,
    pendingBlockModifiers: opts?.pendingBlockModifiers,
  });
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
