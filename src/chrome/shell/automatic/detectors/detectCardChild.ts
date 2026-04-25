/**
 * Detector: parent is a Card → segment (tight flex-col group inside the card).
 */

import type { Detector } from "../automaticIntent";

export const detectCardChild: Detector = ctx => {
  const parentName = ctx.parent?.data?.custom?.displayName;
  if (parentName === "Card" || parentName === "Segment") {
    return { kind: "segment", parentId: ctx.parentId };
  }
  return null;
};
