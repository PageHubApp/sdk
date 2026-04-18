/**
 * Discriminated intents for spatial drag — single place to name behaviors.
 * Placement for Craft remains { parent, index, where: string }; this types the meaning.
 */

import type { AlignmentIntent } from "../alignmentInference";
import type { BesideSide } from "../layoutInference";

export type { BesideSide };

/** Main-axis reorder slot (before/after sibling). */
export type ReorderMainIntent = {
  kind: "reorder_main";
  index: number;
  where: string;
};

/** Beside target sibling — Craft uses where beside-left / beside-right. */
export type BesideIntent = {
  kind: "beside";
  side: BesideSide;
  index: number;
};

/** Cross-axis only (rare snapshot — usually folded into compound). */
export type AlignCrossIntent = {
  kind: "align_cross";
  intent: AlignmentIntent;
};

/** Reorder or beside plus cross-axis alignment in one drag tick. */
export type CompoundSpatialIntent = {
  kind: "compound";
  placement: ReorderMainIntent | BesideIntent;
  alignCross: AlignmentIntent;
};

export type SpatialIntent = ReorderMainIntent | BesideIntent | AlignCrossIntent | CompoundSpatialIntent;

export function isBesideIntent(where: string): where is BesideSide {
  return where === "beside-left" || where === "beside-right";
}
