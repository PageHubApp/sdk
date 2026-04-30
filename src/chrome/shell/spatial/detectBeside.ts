/**
 * Beside detection for flex-col parents — horizontal edge bands on a target child.
 */

import type { Node } from "@craftjs/core";
import {
  BESIDE_HYSTERESIS_PX,
  BESIDE_MAX_EDGE_PX,
  BESIDE_MIN_EDGE_PX,
  BESIDE_MIN_WIDTH,
  BESIDE_VERTICAL_GUTTER_RATIO,
  BESIDE_ZONE,
} from "../besideConstants";
import { SKIP_TYPES } from "../layoutInference";
import type { BesideSide } from "../layoutInference";
import type { InFlowEntry } from "./reorderMainAxis";

let _lastBesideSide: string | null = null;
let _lastBesideFingerprint = "";

export function resetBesideHysteresis() {
  _lastBesideSide = null;
  _lastBesideFingerprint = "";
}

export type BesideHit = { where: BesideSide; index: number };

/**
 * Returns beside placement if pointer is in left/right edge bands; otherwise null.
 * Only applies to column parents with 2+ in-flow children and wide enough target.
 */
export function tryBesideInColumn(
  parent: Node,
  parentDom: HTMLElement | null,
  isRow: boolean,
  nearestEntry: InFlowEntry,
  inFlow: InFlowEntry[],
  posX: number,
  posY: number
): BesideHit | null {
  const nearest = nearestEntry.dim;

  if (!parentDom || nearest.outerWidth < BESIDE_MIN_WIDTH || inFlow.length < 2) {
    return null;
  }

  const parentType = parent.data?.props?.type;
  if (SKIP_TYPES.has(parentType) || isRow) {
    return null;
  }

  const relX = posX - nearest.left;
  const relY = posY - nearest.top;
  const w = nearest.outerWidth;
  const h = nearest.outerHeight;

  const verticalGutter = Math.min(Math.max(h * BESIDE_VERTICAL_GUTTER_RATIO, 18), 56);
  const inVerticalBody = relY >= verticalGutter && relY <= h - verticalGutter;

  if (!inVerticalBody || w <= 0) {
    return null;
  }

  const fingerprint = `${nearest.left},${nearest.top},${w},${h}`;
  const sameChild = fingerprint === _lastBesideFingerprint;
  const edgeBand = Math.min(Math.max(w * BESIDE_ZONE, BESIDE_MIN_EDGE_PX), BESIDE_MAX_EDGE_PX);

  const leftBand =
    edgeBand + (sameChild && _lastBesideSide === "beside-left" ? BESIDE_HYSTERESIS_PX : 0);
  const rightBand =
    edgeBand + (sameChild && _lastBesideSide === "beside-right" ? BESIDE_HYSTERESIS_PX : 0);

  if (relX >= 0 && relX <= leftBand) {
    _lastBesideSide = "beside-left";
    _lastBesideFingerprint = fingerprint;
    return { where: "beside-left", index: nearestEntry.idx };
  }
  if (relX >= 0 && relX >= w - rightBand) {
    _lastBesideSide = "beside-right";
    _lastBesideFingerprint = fingerprint;
    return { where: "beside-right", index: nearestEntry.idx };
  }

  _lastBesideSide = null;
  _lastBesideFingerprint = "";
  return null;
}
