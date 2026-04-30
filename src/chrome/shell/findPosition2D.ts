/**
 * Spatial (2D) position algorithm for drag-and-drop.
 *
 * Thin orchestrator: reorder main-axis → beside → align cross-axis → nearest zone.
 * Replaces CraftJS's built-in 1D findPosition (Editor option in @craftjs/core 0.2.17).
 */

import type { Node, NodeInfo } from "@craftjs/core";
import type { NodeId } from "@craftjs/core";
import { updateAlignCrossFromDrag } from "./spatial/detectAlignCrossFromDrag";
import { resetBesideHysteresis, tryBesideInColumn } from "./spatial/detectBeside";
import {
  buildMainAxisHelpers,
  findNearestByMainAxis,
  nearestChildReorderWhere,
  sortInFlowChildren,
  tryEarlyReorderSlot,
} from "./spatial/reorderMainAxis";
import type { BesideIntent, ReorderMainIntent } from "./spatial/spatialIntent";
import {
  getAlignmentDom as sessionGetAlignmentDom,
  getAlignmentIntent as sessionGetAlignmentIntent,
  getCommittedAlignment as sessionGetCommittedAlignment,
  getCrossAxisIntentForSnapshot,
  getDragOrigin as sessionGetDragOrigin,
  resetSpatialSession,
  setActiveCrossAxisAlign,
  setDragOrigin as sessionSetDragOrigin,
  setLastResolvedIntent,
} from "./spatial/spatialSession";

export type { DragOriginState } from "./spatial/spatialSession";
export type { SpatialIntent } from "./spatial/spatialIntent";
export { getLastResolvedIntent } from "./spatial/spatialSession";

interface DropPosition {
  parent: Node;
  index: number;
  where: string;
}

const isDev = process.env.NODE_ENV === "development";
const log = isDev
  ? (label: string, data?: Record<string, any>) => console.log(`[pos2d] ${label}`, data ?? "")
  : () => {};

/** Resolve parent flex direction from DOM. Shared by algorithm + indicators. */
export function getParentFlexDirection(dom: HTMLElement | null | undefined): "row" | "col" {
  if (!dom) return "col";
  const dir = window.getComputedStyle(dom).flexDirection;
  return dir === "row" || dir === "row-reverse" ? "row" : "col";
}

function isReversed(dom: HTMLElement | null | undefined): boolean {
  if (!dom) return false;
  const dir = window.getComputedStyle(dom).flexDirection;
  return dir === "row-reverse" || dir === "column-reverse";
}

export function getDragOrigin() {
  return sessionGetDragOrigin();
}

export function setDragOrigin(
  nodeId: NodeId,
  parentId: NodeId | undefined,
  startX?: number,
  startY?: number
) {
  sessionSetDragOrigin(nodeId, parentId, startX, startY);
}

export function getCommittedAlignment() {
  return sessionGetCommittedAlignment();
}

export function getAlignmentIntent() {
  return sessionGetAlignmentIntent();
}

export function getAlignmentDom() {
  return sessionGetAlignmentDom();
}

/** Reset all spatial + drag state — call on dragend. */
export function resetSpatialState() {
  resetBesideHysteresis();
  resetSpatialSession();
}

function toPlacementIntent(result: DropPosition): ReorderMainIntent | BesideIntent {
  if (result.where === "beside-left" || result.where === "beside-right") {
    return { kind: "beside", side: result.where, index: result.index };
  }
  return { kind: "reorder_main", index: result.index, where: result.where };
}

function syncResolvedIntent(result: DropPosition) {
  const placement = toPlacementIntent(result);
  const align = getCrossAxisIntentForSnapshot();
  if (align) {
    setLastResolvedIntent({ kind: "compound", placement, alignCross: align });
  } else {
    setLastResolvedIntent(placement);
  }
}

export function findPosition2D(
  parent: Node,
  dims: NodeInfo[],
  posX: number,
  posY: number
): DropPosition {
  const result: DropPosition = { parent, index: 0, where: "before" };

  const parentDom = parent.dom as HTMLElement | null;
  const isRow = getParentFlexDirection(parentDom) === "row";
  const reversed = isReversed(parentDom);
  const axis = isRow ? "row" : "col";

  log("tick", {
    parentId: parent.id,
    parentType: parent.data?.props?.type,
    displayName: parent.data?.custom?.displayName,
    axis,
    children: dims.length,
    cursorX: Math.round(posX),
    cursorY: Math.round(posY),
  });

  if (dims.length === 0) {
    log("empty", { axis });
    syncResolvedIntent(result);
    return result;
  }

  const h = buildMainAxisHelpers(isRow, posX, posY);
  const draggedId = sessionGetDragOrigin()?.nodeId as string | undefined;
  if (isDev && draggedId)
    log("exclude-dragged", { draggedId, dimIds: dims.map(d => (d as { id?: string }).id) });

  const inFlow = sortInFlowChildren(dims, draggedId, h.getMainStart);

  if (inFlow.length === 0) {
    result.index = dims.length - 1;
    result.where = "after";
    log("no-visible", { axis, totalDims: dims.length });
    syncResolvedIntent(result);
    return result;
  }

  log("children", {
    axis,
    inFlow: inFlow.length,
    ranges: inFlow.map(e => ({
      idx: e.idx,
      id: (e.dim as { id?: string }).id,
      mainStart: Math.round(h.getMainStart(e.dim)),
      mainEnd: Math.round(h.getMainEnd(e.dim)),
    })),
    mainPos: Math.round(h.mainPos),
  });

  const early = tryEarlyReorderSlot(inFlow, h, reversed);
  if (early) {
    // Must refresh cross-axis alignment here — gap/before-all/after-all return before the
    // nearest+zone path that normally calls updateAlignCrossFromDrag, or center (cursor in
    // parent middle third) never updates while the pointer stays in a sibling gap.
    updateAlignCrossFromDrag(isRow, parentDom, posX, posY, parent);
    result.index = early.index;
    result.where = early.where;
    if (early.reason === "gap" && early.gapBetween) {
      log("gap", { between: early.gapBetween[0], and: early.gapBetween[1], axis, reversed });
    } else if (early.reason === "before_all") {
      log("before-all", {
        axis,
        reversed,
        mainPos: Math.round(h.mainPos),
        firstStart: Math.round(h.getMainStart(inFlow[0].dim)),
      });
    } else {
      const last = inFlow[inFlow.length - 1].dim;
      log("after-all", {
        axis,
        reversed,
        mainPos: Math.round(h.mainPos),
        lastEnd: Math.round(h.getMainEnd(last)),
      });
    }
    syncResolvedIntent(result);
    return result;
  }

  const { nearestEntry, nearestDist } = findNearestByMainAxis(inFlow, h.mainPos, h.getMainCenter);
  const nearest = nearestEntry.dim;
  result.index = nearestEntry.idx;
  log("nearest", {
    axis,
    childIdx: nearestEntry.idx,
    childId: (nearest as { id?: string }).id,
    dist: Math.round(nearestDist),
  });

  const besideHit = tryBesideInColumn(parent, parentDom, isRow, nearestEntry, inFlow, posX, posY);
  if (besideHit) {
    setActiveCrossAxisAlign(null, null);
    result.index = besideHit.index;
    result.where = besideHit.where;
    log(besideHit.where, { child: nearestEntry.idx });
    syncResolvedIntent(result);
    return result;
  }

  updateAlignCrossFromDrag(isRow, parentDom, posX, posY, parent);

  result.where = nearestChildReorderWhere(nearest, h, reversed);
  log("zone", {
    child: nearestEntry.idx,
    childId: (nearest as { id?: string }).id,
    where: result.where,
    relMain: Math.round(h.mainPos - h.getMainStart(nearest)),
    mainSize: Math.round(h.getMainSize(nearest)),
    axis,
    reversed,
  });
  syncResolvedIntent(result);
  return result;
}
