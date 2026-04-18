/**
 * Detector: morph based on parent `props.type` (structural role).
 *
 * Currently:
 * - page    → Section
 * - section → Content
 *
 * Header/footer/form branches live here when added later.
 */

import type { Detector } from "../automaticIntent";

export const detectStructural: Detector = ctx => {
  // Safety guard: never re-morph a node that already has a structural type.
  const nodeType = ctx.node.data?.props?.type;
  if (
    nodeType === "section" ||
    nodeType === "page" ||
    nodeType === "header" ||
    nodeType === "footer"
  ) {
    return null;
  }

  if (ctx.parentType === "page") {
    return { kind: "section", parentId: ctx.parentId };
  }

  if (ctx.parentType === "section") {
    return { kind: "content", parentId: ctx.parentId };
  }

  return null;
};
