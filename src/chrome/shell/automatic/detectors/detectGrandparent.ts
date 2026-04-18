/**
 * Detector: morph based on grandparent role (chained context).
 *
 * Currently:
 * - parent is a regular container and grandparent is section/page → Card
 *
 * Card → card-body / card-title / card-actions chaining lives here when added later.
 */

import type { Detector } from "../automaticIntent";

export const detectGrandparent: Detector = ctx => {
  if (ctx.parentType === "page" || ctx.parentType === "section") return null;

  if (ctx.grandparentType === "section" || ctx.grandparentType === "page") {
    return { kind: "card", parentId: ctx.parentId };
  }

  return null;
};
