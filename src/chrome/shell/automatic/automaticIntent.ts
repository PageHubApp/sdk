/**
 * Automatic smart-drop — intent types + shared context.
 *
 * The morph pipeline reads like spatial/: an ordered list of detectors that
 * each return an intent (or null to defer). The orchestrator dispatches the
 * first hit to a per-kind executor. Discriminant: `intent.kind`.
 */

import type { MergedActions } from "../spatial/mergedActions";

/** Everything a detector needs — built once, shared across the pipeline. */
export interface MorphContext {
  nodeId: string;
  parentId: string;
  node: any;
  parent: any;
  parentType: string | undefined;
  parentClassName: string;
  grandparent: any | null;
  grandparentType: string | undefined;
  siblings: any[];
  siblingCount: number;
  isEmptyParent: boolean;
  query: any;
}

export type AutomaticIntent =
  | { kind: "section"; parentId: string }
  | { kind: "content"; parentId: string }
  | { kind: "card"; parentId: string }
  | { kind: "segment"; parentId: string }
  | { kind: "hero"; parentId: string; theme?: "light" | "dark" }
  | { kind: "cardBody"; parentId: string; slot: "title" | "body" | "actions" }
  | { kind: "stat"; parentId: string }
  | { kind: "alertBody"; parentId: string }
  | { kind: "tabItem"; parentId: string }
  | { kind: "menuItem"; parentId: string }
  | { kind: "carouselItem"; parentId: string }
  | { kind: "navbarSegment"; parentId: string }
  | { kind: "headerGroup"; parentId: string }
  | { kind: "footerColumn"; parentId: string }
  | { kind: "formGroup"; parentId: string }
  | { kind: "plainContainer"; parentId: string };

export type AutomaticIntentKind = AutomaticIntent["kind"];

export type Detector = (ctx: MorphContext) => AutomaticIntent | null;

export type Executor<I extends AutomaticIntent = AutomaticIntent> = (
  intent: I,
  batch: MergedActions,
  ctx: MorphContext
) => void;
