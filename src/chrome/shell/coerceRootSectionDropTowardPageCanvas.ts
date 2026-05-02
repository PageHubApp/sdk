/**
 * When the pointer sits in a ROOT-level flex gap (e.g. between the page shell and
 * the footer), Craft resolves placement as a sibling of `page`/`footer` on ROOT.
 * Sections are not allowed on ROOT (`layoutCanvasCanMoveIn` / Background rules) —
 * treat those slots as "into the page canvas" instead (start or end of page children).
 */

import type { DropPosition, Node } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { getDragOrigin } from "./spatial/spatialSession";

function firstDraggedSectionId(query: any): string | null {
  if (!query?.getEvent) return null;
  const raw = query.getEvent("dragged")?.all?.() ?? [];
  const ids = Array.isArray(raw) ? raw : [...raw];
  for (const id of ids) {
    const n = query.node(id)?.get?.();
    if (n?.data?.props?.type === "section") return id as string;
  }
  const origin = getDragOrigin()?.nodeId as string | undefined;
  if (origin) {
    const n = query.node(origin)?.get?.();
    if (n?.data?.props?.type === "section") return origin;
  }
  return null;
}

export function coerceRootSectionDropTowardPageCanvas(
  query: any | null | undefined,
  rootParent: Node,
  base: DropPosition
): DropPosition {
  if (!query || rootParent.id !== ROOT_NODE || base.parent.id !== ROOT_NODE) return base;

  const where = base.where;
  if (where !== "before" && where !== "after") return base;

  if (!firstDraggedSectionId(query)) return base;

  const root = query.node(ROOT_NODE).get();
  const childIds = (root?.data?.nodes || []) as string[];
  if (!childIds.length) return base;

  const pageId = childIds.find(id => query.node(id).get()?.data?.props?.type === "page");
  if (!pageId) return base;

  const pageNode = query.node(pageId).get();
  if (!pageNode) return base;

  const refChildId = childIds[base.index];
  if (!refChildId) return base;
  const refType = query.node(refChildId).get()?.data?.props?.type;

  const atPageStart =
    (where === "before" && refChildId === pageId) || (where === "after" && refType === "header");
  const atPageEnd =
    (where === "after" && refChildId === pageId) ||
    (where === "before" && refType === "footer") ||
    (where === "after" && refType === "footer");

  if (!atPageStart && !atPageEnd) return base;

  const pageChildIds = (pageNode.data?.nodes || []) as string[];

  if (atPageEnd) {
    if (pageChildIds.length === 0) {
      return { parent: pageNode, index: 0, where: "before" };
    }
    return { parent: pageNode, index: pageChildIds.length - 1, where: "after" };
  }

  if (pageChildIds.length === 0) {
    return { parent: pageNode, index: 0, where: "before" };
  }
  return { parent: pageNode, index: 0, where: "before" };
}
