/**
 * Automatic smart-drop orchestrator.
 *
 * Shape mirrors spatial/findPosition2D: build context once, walk an ordered
 * detector pipeline, first hit wins, dispatch its executor through the merged
 * batch so the whole drop lands in a single undo step.
 *
 * Extension rule: add a new morph → add detector + executor + intent variant.
 * No edits to this file beyond wiring the two new pieces in.
 */

import type { MergedActions } from "../spatial/mergedActions";
import type { AutomaticIntent, AutomaticIntentKind, Detector, Executor } from "./automaticIntent";
import { buildMorphContext } from "./helpers";

import { detectStructural } from "./detectors/detectStructural";
import { detectGrandparent } from "./detectors/detectGrandparent";
import { detectFallback } from "./detectors/detectFallback";

import { morphToSection } from "./executors/morphToSection";
import { morphToContent } from "./executors/morphToContent";
import { morphToCard } from "./executors/morphToCard";
import { morphToPlainContainer } from "./executors/morphToPlainContainer";

const DETECTOR_PIPELINE: Detector[] = [
  detectStructural,
  detectGrandparent,
  detectFallback,
];

const EXECUTORS: Record<AutomaticIntentKind, Executor<any>> = {
  section: morphToSection,
  content: morphToContent,
  card: morphToCard,
  plainContainer: morphToPlainContainer,
  // Remaining kinds are wired up as their executors land.
  hero: morphToPlainContainer,
  cardBody: morphToPlainContainer,
  stat: morphToPlainContainer,
  alertBody: morphToPlainContainer,
  tabItem: morphToPlainContainer,
  menuItem: morphToPlainContainer,
  carouselItem: morphToPlainContainer,
  navbarSegment: morphToPlainContainer,
  headerGroup: morphToPlainContainer,
  footerColumn: morphToPlainContainer,
  formGroup: morphToPlainContainer,
};

export function applyAutomaticMorph(
  batch: MergedActions,
  query: any,
  nodeId: string,
  parentId: string
): void {
  const node = query.node(nodeId).get();
  if (!node || node.data?.custom?.displayName !== "Automatic") return;

  const ctx = buildMorphContext(query, nodeId, parentId);
  if (!ctx) return;

  for (const detect of DETECTOR_PIPELINE) {
    const intent: AutomaticIntent | null = detect(ctx);
    if (!intent) continue;
    if (process.env.NODE_ENV === "development") {
      console.log("[auto] matched", { detector: detect.name, kind: intent.kind });
    }
    const exec = EXECUTORS[intent.kind];
    exec(intent, batch, ctx);
    return;
  }
}
