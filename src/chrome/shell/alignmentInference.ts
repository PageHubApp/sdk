/**
 * Alignment inference: drag-to-align detection.
 *
 * During drag, reads cursor position relative to the drop-target container
 * and infers alignment intent from which zone the cursor is in.
 *
 * flex-col: X axis = alignment (left/center/right)
 * flex-row: Y axis = alignment (top/center/bottom)
 *
 * Orthogonal to CraftJS reorder (which handles the other axis).
 * Suppressed when beside detection is active.
 */

import { type Node, type NodeId } from "@craftjs/core";
import { Container } from "../../components/Container";
import { SKIP_TYPES, makeContainerTree } from "./layoutInference";

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

// ── Shared state (survives HMR/module splits via window) ──

const INTENT_KEY = "__pagehub_alignment_intent__";
const DRAG_ORIGIN_KEY = "__pagehub_alignment_drag_origin__";

export function setAlignmentIntent(intent: AlignmentIntent | null, view?: string, classDark?: boolean) {
  (window as any)[INTENT_KEY] = intent ? { intent, view: view || "mobile", classDark: classDark ?? false } : null;
}

export function getAlignmentDropContext(): AlignmentDropContext | null {
  return (window as any)[INTENT_KEY] as AlignmentDropContext | null;
}

export function clearAlignmentIntent() {
  (window as any)[INTENT_KEY] = null;
  (window as any)[DRAG_ORIGIN_KEY] = null;
}

/** Store the first node that starts dragging (innermost = the actual content node). */
export function setDragOrigin(nodeId: NodeId, parentId: NodeId | undefined) {
  if (!(window as any)[DRAG_ORIGIN_KEY]) {
    (window as any)[DRAG_ORIGIN_KEY] = { nodeId, parentId };
  }
}

export function getDragOrigin(): { nodeId: NodeId; parentId: NodeId | undefined } | null {
  return (window as any)[DRAG_ORIGIN_KEY] || null;
}

// ── Zone thresholds ────────────────────────────────────────────────────

const START_ZONE = 0.30;
const END_ZONE = 0.70;
const MIN_CONTAINER_SIZE = 200; // px — skip detection if container is too narrow/short


// ── Detection ──────────────────────────────────────────────────────────

/**
 * Detect alignment intent from cursor position relative to the parent container.
 * Returns null if detection shouldn't activate (wrong container type, too small, etc).
 */
export function detectAlignmentIntent(
  parentDom: HTMLElement,
  parentNode: Node,
  posX: number,
  posY: number
): AlignmentIntent | null {
  if (!parentDom) return null;

  const parentType = parentNode?.data?.props?.type;
  if (SKIP_TYPES.has(parentType)) return null;

  const style = window.getComputedStyle(parentDom);
  const display = style.display;
  if (!display.includes("flex")) return null;

  const dir = style.flexDirection;
  const isCol = dir === "column" || dir === "column-reverse";
  const isRow = dir === "row" || dir === "row-reverse";
  if (!isCol && !isRow) return null;

  const rect = parentDom.getBoundingClientRect();

  if (isCol) {
    // flex-col: cross-axis is horizontal → X determines alignment
    if (rect.width < MIN_CONTAINER_SIZE) return null;
    const relX = posX - rect.left;
    const ratio = relX / rect.width;
    return {
      zone: ratio < START_ZONE ? "start" : ratio > END_ZONE ? "end" : "center",
      axis: "horizontal",
    };
  }

  // flex-row: cross-axis is vertical → Y determines alignment
  if (rect.height < MIN_CONTAINER_SIZE) return null;
  const relY = posY - rect.top;
  const ratio = relY / rect.height;
  return {
    zone: ratio < START_ZONE ? "start" : ratio > END_ZONE ? "end" : "center",
    axis: "vertical",
  };
}

// ── Labels ─────────────────────────────────────────────────────────────

const LABELS: Record<string, Record<AlignmentZone, string>> = {
  horizontal: { start: "Align left", center: "Align center", end: "Align right" },
  vertical: { start: "Align top", center: "Align middle", end: "Align bottom" },
};

export function getAlignmentPreviewLabel(intent: AlignmentIntent): string {
  return LABELS[intent.axis]?.[intent.zone] || "Align";
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

  // Clean up old Align wrapper if it's now empty (node moved out of it)
  if (previousParentId && previousParentId !== parentId) {
    const prevParent = query.node(previousParentId).get();
    const prevChildren = prevParent?.data?.nodes || [];
    if (isAlignWrapper(prevParent) && prevChildren.length === 0) {
      log("cleanup-empty-wrapper", { previousParentId });
      actions.delete(previousParentId);
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
}
