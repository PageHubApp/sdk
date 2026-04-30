/**
 * Optional cursor-zone cross-axis intent (flex parent) when direction-based
 * detection in detectAlignCrossFromDrag does not produce an intent.
 */

import type { Node } from "@craftjs/core";
import type { AlignmentIntent, AlignmentZone } from "../alignmentInference";
import { SKIP_TYPES } from "../layoutInference";
import { getDragOrigin } from "./spatialSession";

export const MIN_ALIGN_CONTAINER_PX = 200;
const INNER_EDGE_PX = 32;
const START_ZONE = 0.3;
const END_ZONE = 0.7;
const CENTER_LO = 1 / 3;
const CENTER_HI = 2 / 3;

/** Skip alignment when both dimensions are tiny (matches legacy guard). */
export function isParentTooSmallForAlign(dom: HTMLElement | null): boolean {
  if (!dom) return true;
  const r = dom.getBoundingClientRect();
  return r.width < MIN_ALIGN_CONTAINER_PX && r.height < MIN_ALIGN_CONTAINER_PX;
}

/**
 * Cross-axis only: flex-col → horizontal; flex-row → vertical.
 * Inner: 32px edges + middle third; outer: ratio bands on cross-axis.
 */
export function inferCrossAxisIntentFromCursorZones(
  parentNode: Node,
  parentDom: HTMLElement,
  posX: number,
  posY: number,
  isFlexRow: boolean
): AlignmentIntent | null {
  const parentType = parentNode.data?.props?.type;
  if (SKIP_TYPES.has(parentType)) return null;

  const style = window.getComputedStyle(parentDom);
  if (!style.display.includes("flex")) return null;

  const rect = parentDom.getBoundingClientRect();
  if (rect.width < MIN_ALIGN_CONTAINER_PX && rect.height < MIN_ALIGN_CONTAINER_PX) {
    return null;
  }

  const origin = getDragOrigin();
  const isInner = origin?.parentId === parentNode.id;

  const isCol = !isFlexRow;

  if (isInner) {
    const relX = posX - rect.left;
    const relY = posY - rect.top;

    if (isCol) {
      if (rect.width < MIN_ALIGN_CONTAINER_PX) return null;
      if (relX < INNER_EDGE_PX) return { zone: "start", axis: "horizontal" };
      if (relX > rect.width - INNER_EDGE_PX) return { zone: "end", axis: "horizontal" };
      const rx = relX / rect.width;
      if (rx > CENTER_LO && rx < CENTER_HI) return { zone: "center", axis: "horizontal" };
      return null;
    }

    if (rect.height < MIN_ALIGN_CONTAINER_PX) return null;
    if (relY < INNER_EDGE_PX) return { zone: "start", axis: "vertical" };
    if (relY > rect.height - INNER_EDGE_PX) return { zone: "end", axis: "vertical" };
    const ry = relY / rect.height;
    if (ry > CENTER_LO && ry < CENTER_HI) return { zone: "center", axis: "vertical" };
    return null;
  }

  if (isCol) {
    if (rect.width < MIN_ALIGN_CONTAINER_PX) return null;
    const ratioX = (posX - rect.left) / rect.width;
    const zone: AlignmentZone =
      ratioX < START_ZONE ? "start" : ratioX > END_ZONE ? "end" : "center";
    return { zone, axis: "horizontal" };
  }

  if (rect.height < MIN_ALIGN_CONTAINER_PX) return null;
  const ratioY = (posY - rect.top) / rect.height;
  const zone: AlignmentZone = ratioY < START_ZONE ? "start" : ratioY > END_ZONE ? "end" : "center";
  return { zone, axis: "vertical" };
}
