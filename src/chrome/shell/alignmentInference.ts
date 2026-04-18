/**
 * Alignment on drop: applyAlignmentOnDrop, inner/wrapper class resolution, labels.
 *
 * **Intent during drag** is owned by the spatial engine (`findPosition2D` →
 * `spatial/detectAlignCrossFromDrag` → `spatialSession`). Do not add a second
 * detector here — that caused drift vs DropZoneIndicator.
 */

import { type Node, type NodeId } from "@craftjs/core";
import { Container } from "../../components/Container";
import { SKIP_TYPES, makeContainerTree, getClassName, hasToken } from "./layoutInference";

// ── Debug logging (dev only) ──────────────────────────────────────────

const isDev = process.env.NODE_ENV === "development";
const log = isDev
  ? (label: string, data?: Record<string, any>) => console.log(`[align] ${label}`, data ?? "")
  : () => {};

// ── Types ──────────────────────────────────────────────────────────────

export type AlignmentZone = "start" | "center" | "end";

export interface AlignmentIntent {
  zone: AlignmentZone;
  axis: "horizontal" | "vertical";
}

/** Full drop context — intent + view info needed by the class writer. */
export interface AlignmentDropContext {
  intent: AlignmentIntent;
  view: string;
  classDark: boolean;
  /** Parent ID before CraftJS move — captured at dragend before rAF. */
  previousParentId?: NodeId;
}

// ── Labels ─────────────────────────────────────────────────────────────

const LABELS: Record<string, Record<AlignmentZone, string>> = {
  horizontal: { start: "Align left", center: "Align center", end: "Align right" },
  vertical: { start: "Align top", center: "Align middle", end: "Align bottom" },
};

const INNER_LABELS: Record<string, Record<AlignmentZone, string>> = {
  horizontal: { start: "Align left", center: "Center", end: "Align right" },
  vertical: { start: "Align top", center: "Center", end: "Align bottom" },
};

export function getAlignmentPreviewLabel(intent: AlignmentIntent, isInner?: boolean): string {
  const labels = isInner ? INNER_LABELS : LABELS;
  return labels[intent.axis]?.[intent.zone] || "Align";
}

// ── Wrapper classNames ─────────────────────────────────────────────────

// Horizontal axis (parent is flex-col): wrapper spans full width, justify positions child
const WRAPPER_CLASS_HORIZONTAL: Record<AlignmentZone, string> = {
  start: "flex w-full justify-start",
  center: "flex w-full justify-center",
  end: "flex w-full justify-end",
};

// Vertical axis (parent is flex-row): wrapper stretches to row height, items positions child
const WRAPPER_CLASS_VERTICAL: Record<AlignmentZone, string> = {
  start: "flex flex-col self-stretch items-start justify-start",
  center: "flex flex-col self-stretch items-center justify-center",
  end: "flex flex-col self-stretch items-end justify-end",
};

function getWrapperClass(zone: AlignmentZone, axis: "horizontal" | "vertical") {
  return axis === "vertical" ? WRAPPER_CLASS_VERTICAL[zone] : WRAPPER_CLASS_HORIZONTAL[zone];
}

// ── Inner alignment (no-wrapper mode) ────────────────────────────────

const ITEMS_TOKENS = [
  "items-start",
  "items-center",
  "items-end",
  "items-baseline",
  "items-stretch",
];
const JUSTIFY_TOKENS = [
  "justify-start",
  "justify-center",
  "justify-end",
  "justify-between",
  "justify-around",
  "justify-evenly",
  "justify-stretch",
];
const SELF_TOKENS = [
  "self-auto",
  "self-start",
  "self-center",
  "self-end",
  "self-stretch",
  "self-baseline",
];

function getInnerAlignmentTarget(
  node: Node,
  parentNode: Node
): { mode: "parent" | "self"; targetId: NodeId; parentDirection: "row" | "col" } | null {
  const parentClassName = getClassName(parentNode);
  if (!hasToken(parentClassName, "flex")) return null;
  const parentType = parentNode.data?.props?.type;
  if (SKIP_TYPES.has(parentType)) return null;

  const isRow = hasToken(parentClassName, "flex-row");
  const dir = isRow ? ("row" as const) : ("col" as const);
  const siblingCount = (parentNode.data.nodes || []).length;

  if (siblingCount <= 1) {
    return { mode: "parent", targetId: parentNode.id, parentDirection: dir };
  }
  return { mode: "self", targetId: node.id, parentDirection: dir };
}

function resolveInnerAlignmentClass(
  zone: AlignmentZone,
  axis: "horizontal" | "vertical",
  mode: "parent" | "self",
  parentDirection: "row" | "col"
): { className: string; tokensToStrip: string[]; alwaysParent: boolean } {
  const v = zone; // "start" | "center" | "end"

  // Is this the cross-axis or main-axis relative to parent direction?
  const isCrossAxis =
    (parentDirection === "col" && axis === "horizontal") ||
    (parentDirection === "row" && axis === "vertical");

  // Cross-axis: always use self-* on the node — works regardless of parent constraints
  if (isCrossAxis) {
    return { className: `self-${v}`, tokensToStrip: SELF_TOKENS, alwaysParent: false };
  }
  // Main-axis — always modify parent's justify-* (no self equivalent in flex)
  return { className: `justify-${v}`, tokensToStrip: JUSTIFY_TOKENS, alwaysParent: true };
}

export function wouldUseInnerAlignment(query: any, parentNodeId: NodeId, nodeId: NodeId): boolean {
  const node = query.node(nodeId).get();
  const parentNode = query.node(parentNodeId).get();
  if (!node?.data || !parentNode?.data) return false;
  return getInnerAlignmentTarget(node, parentNode) !== null;
}

// ── Drop handler ───────────────────────────────────────────────────────

/**
 * Wrap the dragged node in an alignment container.
 *
 * In a flex-col parent, a child can't move left/right on its own.
 * We wrap it in a full-width flex row with justify-start/center/end
 * so it positions within the row. Same structural pattern as beside/split.
 *
 * For "center" zone: skip if parent already has items-center (node is already centered).
 *
 * Needs ContainerComponent to create wrapper nodes via CraftJS.
 */
function isAlignWrapper(node: any): boolean {
  return node?.data?.custom?.displayName === "Align" && node?.data?.name === "Container";
}

export function applyAlignmentOnDrop(
  actions: any,
  nodeId: NodeId,
  intent: AlignmentIntent,
  view: string,
  classDark: boolean,
  query: any,
  previousParentId?: NodeId
) {
  const node = query.node(nodeId).get();
  if (!node?.data) return;

  log("apply", { nodeId, zone: intent.zone, axis: intent.axis, view, previousParentId });

  // If the dragged node IS an Align wrapper, just update its className directly
  if (isAlignWrapper(node)) {
    log("update-wrapper", { nodeId, zone: intent.zone, axis: intent.axis });
    actions.setProp(nodeId, (props: Record<string, any>) => {
      props.className = getWrapperClass(intent.zone, intent.axis);
    });
    return;
  }

  const parentId = node.data.parent;
  if (!parentId) return;

  const parentNode = query.node(parentId).get();
  if (!parentNode?.data) return;

  const parentType = parentNode.data.props?.type;
  if (SKIP_TYPES.has(parentType)) {
    log("skip", { reason: "parent-is-skip-type", parentType });
    return;
  }

  const parentClassName = parentNode.data.props?.className || "";
  const wrapperClassName = getWrapperClass(intent.zone, intent.axis);

  // If already inside an Align wrapper, just update its className
  if (isAlignWrapper(parentNode)) {
    log("update-parent-wrapper", { parentId, zone: intent.zone, axis: intent.axis });
    actions.setProp(parentId, (props: Record<string, any>) => {
      props.className = wrapperClassName;
    });
    return;
  }

  // Inner alignment: node is in a flex container — modify classes instead of wrapping.
  // Only runs when the indicator detected align-inner (not align-wrap).
  // CraftJS may have moved the node before we run (rAF), so check the ORIGINAL
  // parent (previousParentId) first — that's the container the user was aligning within.
  // Inner alignment — only when the indicator detected align-inner, not align-wrap
  const intentType = (intent as any).type;
  if (intentType !== "align-wrap") {
    let innerParentNode = parentNode;
    let innerParentId = parentId;

    if (previousParentId && previousParentId !== parentId) {
      const origParent = query.node(previousParentId).get();
      if (origParent?.data && getInnerAlignmentTarget(node, origParent)) {
        innerParentNode = origParent;
        innerParentId = previousParentId;
      }
    }

    const innerTarget = getInnerAlignmentTarget(node, innerParentNode);
    if (innerTarget) {
      const resolved = resolveInnerAlignmentClass(
        intent.zone,
        intent.axis,
        innerTarget.mode,
        innerTarget.parentDirection
      );
      // Cross-axis (self-*) always targets the node; main-axis (justify-*) targets the parent
      const effectiveTargetId = resolved.alwaysParent ? innerParentId : nodeId;

      if (innerParentId !== parentId) {
        log("inner-align-restore", { from: parentId, to: innerParentId });
        actions.move([nodeId], innerParentId, 0);
      }

      const batch = innerParentId !== parentId ? actions.history.merge() : actions;
      log("inner-align", {
        mode: innerTarget.mode,
        targetId: effectiveTargetId,
        className: resolved.className,
        axis: intent.axis,
        parentDir: innerTarget.parentDirection,
      });

      batch.setProp(effectiveTargetId, (props: Record<string, any>) => {
        const tokens = (props.className || "")
          .split(/\s+/)
          .filter((t: string) => t && !resolved.tokensToStrip.includes(t));
        tokens.push(resolved.className);
        props.className = tokens.join(" ");
      });
      return true;
    }
  }

  // If center and parent already centers, nothing to do
  if (intent.zone === "center" && /\bitems-center\b/.test(parentClassName)) {
    log("skip", { reason: "already-centered" });
    return;
  }

  const nodeIndex = (parentNode.data.nodes || []).indexOf(nodeId);
  if (nodeIndex < 0) return;

  log("create-wrapper", { nodeId, parentId, nodeIndex, wrapperClassName });

  // Create wrapper, insert at node's position, move node into it
  const wrapperTree = makeContainerTree(query, Container, wrapperClassName, "Align");

  const merged = actions.history.merge();
  actions.addNodeTree(wrapperTree, parentId, nodeIndex);
  merged.move([nodeId], wrapperTree.rootNodeId, 0);

  // Clean up old Align wrapper if it's now empty (node moved out of it)
  if (previousParentId) {
    const prevParent = query.node(previousParentId).get();
    const prevChildren = prevParent?.data?.nodes || [];
    if (isAlignWrapper(prevParent) && prevChildren.length === 0) {
      log("cleanup-empty-wrapper", { previousParentId });
      merged.delete(previousParentId);
    }
  }
}
