/**
 * Main-axis reorder: gaps, before/after-all, nearest child, final before/after zone split.
 */

import type { NodeInfo } from "@craftjs/core";

export type MainAxisHelpers = {
  mainPos: number;
  getMainStart: (d: NodeInfo) => number;
  getMainSize: (d: NodeInfo) => number;
  getMainCenter: (d: NodeInfo) => number;
  getMainEnd: (d: NodeInfo) => number;
};

export type InFlowEntry = { dim: NodeInfo; idx: number };

export function buildMainAxisHelpers(isRow: boolean, posX: number, posY: number): MainAxisHelpers {
  const mainPos = isRow ? posX : posY;
  return {
    mainPos,
    getMainStart: d => (isRow ? d.left : d.top),
    getMainSize: d => (isRow ? d.outerWidth : d.outerHeight),
    getMainCenter: d => {
      const start = isRow ? d.left : d.top;
      const size = isRow ? d.outerWidth : d.outerHeight;
      return start + size / 2;
    },
    getMainEnd: d => {
      const start = isRow ? d.left : d.top;
      const size = isRow ? d.outerWidth : d.outerHeight;
      return start + size;
    },
  };
}

export function sortInFlowChildren(
  dims: NodeInfo[],
  draggedId: string | undefined,
  getMainStart: (d: NodeInfo) => number
): InFlowEntry[] {
  return dims
    .map((d, i) => ({ dim: d, idx: i }))
    .filter(e => e.dim.outerWidth > 0 && e.dim.outerHeight > 0)
    .filter(e => (e.dim as { id?: string }).id !== draggedId)
    .sort((a, b) => getMainStart(a.dim) - getMainStart(b.dim));
}

export type EarlyReorder = {
  index: number;
  where: string;
  reason: "gap" | "before_all" | "after_all";
  gapBetween?: [number, number];
};

/**
 * Steps 1–3: gaps, before first, after last. Returns null if pointer is inside the span of children.
 */
export function tryEarlyReorderSlot(
  inFlow: InFlowEntry[],
  h: MainAxisHelpers,
  reversed: boolean
): EarlyReorder | null {
  const { mainPos, getMainStart, getMainEnd } = h;

  for (let i = 0; i < inFlow.length - 1; i++) {
    const current = inFlow[i].dim;
    const next = inFlow[i + 1].dim;
    const gapStart = getMainEnd(current);
    const gapEnd = getMainStart(next);

    if (gapStart < gapEnd && mainPos >= gapStart && mainPos <= gapEnd) {
      return {
        index: inFlow[i].idx,
        where: reversed ? "before" : "after",
        reason: "gap",
        gapBetween: [i, i + 1],
      };
    }
  }

  const first = inFlow[0];
  if (mainPos < getMainStart(first.dim)) {
    return { index: first.idx, where: reversed ? "after" : "before", reason: "before_all" };
  }

  const last = inFlow[inFlow.length - 1];
  if (mainPos > getMainEnd(last.dim)) {
    return { index: last.idx, where: reversed ? "before" : "after", reason: "after_all" };
  }

  return null;
}

export type NearestPick = {
  nearestEntry: InFlowEntry;
  nearestDist: number;
};

export function findNearestByMainAxis(
  inFlow: InFlowEntry[],
  mainPos: number,
  getMainCenter: (d: NodeInfo) => number
): NearestPick {
  let nearestEntry = inFlow[0];
  let nearestDist = Infinity;

  for (const entry of inFlow) {
    const center = getMainCenter(entry.dim);
    const dist = Math.abs(mainPos - center);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestEntry = entry;
    }
  }

  return { nearestEntry, nearestDist };
}

/** Step 7: split nearest child on main axis into before/after halves. */
export function nearestChildReorderWhere(
  nearest: NodeInfo,
  h: MainAxisHelpers,
  reversed: boolean
): string {
  const relMain = h.mainPos - h.getMainStart(nearest);
  const mainSize = h.getMainSize(nearest);
  const beforeZone = mainSize * 0.3;

  if (relMain < beforeZone) {
    return reversed ? "after" : "before";
  }
  return reversed ? "before" : "after";
}
