/**
 * Cross-axis alignment: direction-dominant drag first, optional cursor-zone fallback.
 * - flex-col: horizontal cross-axis (dominant horizontal drag, or zone hover).
 * - flex-row: vertical cross-axis (dominant vertical drag, or zone hover).
 */

import type { Node } from "@craftjs/core";
import type { AlignmentIntent } from "../alignmentInference";
import {
  inferCrossAxisIntentFromCursorZones,
  isParentTooSmallForAlign,
} from "./alignCrossAxisZones";
import {
  getDragOrigin,
  setActiveCrossAxisAlign,
  clearCrossAxisPreviewOnly,
} from "./spatialSession";

const DRAG_DEADZONE_PX = 20;
const DOMINANT_RATIO = 1.5;
const CENTER_LO = 1 / 3;
const CENTER_HI = 2 / 3;

function hasValidOrigin(): boolean {
  return getDragOrigin() != null;
}

function dragVector(posX: number, posY: number) {
  const origin = getDragOrigin()!;
  const dx = posX - origin.startX;
  const dy = posY - origin.startY;
  return {
    dx,
    dy,
    absDx: Math.abs(dx),
    absDy: Math.abs(dy),
    dragDist: Math.max(Math.abs(dx), Math.abs(dy)),
  };
}

/** Middle third of parent rect along cross axis → center; else start/end from drag sign. */
function zoneFromParentAndCursor(
  parentDom: HTMLElement | null,
  posX: number,
  posY: number,
  crossAxis: "horizontal" | "vertical"
): "start" | "center" | "end" {
  const { dx, dy } = dragVector(posX, posY);
  const mainSign = crossAxis === "horizontal" ? dx : dy;
  let zone: "start" | "center" | "end" = mainSign < 0 ? "start" : "end";

  if (parentDom) {
    const rect = parentDom.getBoundingClientRect();
    if (crossAxis === "horizontal") {
      const rel = (posX - rect.left) / rect.width;
      if (rel > CENTER_LO && rel < CENTER_HI) zone = "center";
    } else {
      const rel = (posY - rect.top) / rect.height;
      if (rel > CENTER_LO && rel < CENTER_HI) zone = "center";
    }
  }
  return zone;
}

/**
 * Updates cross-axis preview + committed alignment module state.
 */
export function updateAlignCrossFromDrag(
  isRow: boolean,
  parentDom: HTMLElement | null,
  posX: number,
  posY: number,
  parent: Node
): void {
  if (isParentTooSmallForAlign(parentDom)) {
    setActiveCrossAxisAlign(null, null);
    return;
  }

  const isFlexRow = isRow;
  let intent: AlignmentIntent | null = null;

  if (hasValidOrigin()) {
    const { absDx, absDy, dragDist } = dragVector(posX, posY);
    if (dragDist >= DRAG_DEADZONE_PX) {
      if (!isFlexRow && absDx > absDy * DOMINANT_RATIO) {
        const zone = zoneFromParentAndCursor(parentDom, posX, posY, "horizontal");
        intent = { zone, axis: "horizontal" };
      } else if (isFlexRow && absDy > absDx * DOMINANT_RATIO) {
        const zone = zoneFromParentAndCursor(parentDom, posX, posY, "vertical");
        intent = { zone, axis: "vertical" };
      }
    }
  }

  if (!intent && parentDom) {
    intent = inferCrossAxisIntentFromCursorZones(parent, parentDom, posX, posY, isFlexRow);
  }

  if (intent) {
    setActiveCrossAxisAlign(intent, parentDom);
    return;
  }

  if (!hasValidOrigin()) {
    clearCrossAxisPreviewOnly();
    return;
  }
  setActiveCrossAxisAlign(null, null);
}
