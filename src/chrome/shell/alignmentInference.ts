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

import React from "react";
import { Element, type Node, type NodeId } from "@craftjs/core";

// ── Types ──────────────────────────────────────────────────────────────

export type AlignmentZone = "start" | "center" | "end";

export interface AlignmentIntent {
  horizontal: AlignmentZone;
  vertical: AlignmentZone;
  flexDir: "col" | "row";
}

/** Full drop context — intent + view info needed by the class writer. */
export interface AlignmentDropContext {
  intent: AlignmentIntent;
  view: string;
  classDark: boolean;
  /** Parent ID before CraftJS move — captured at dragend before rAF. */
  previousParentId?: NodeId;
}

// ── Module-level shared state ─────────────────────────────────────────

let _current: AlignmentDropContext | null = null;
let _dragOrigin: { nodeId: NodeId; parentId: NodeId | undefined } | null = null;
let _besideDropFired = false;

export function setAlignmentIntent(intent: AlignmentIntent | null, view?: string, classDark?: boolean) {
  _current = intent ? { intent, view: view || "mobile", classDark: classDark ?? false } : null;
}

export function getAlignmentDropContext(): AlignmentDropContext | null {
  return _current;
}

export function clearAlignmentIntent() {
  _current = null;
  _dragOrigin = null;
}

export function setDragOrigin(nodeId: NodeId, parentId: NodeId | undefined) {
  if (!_dragOrigin) {
    _dragOrigin = { nodeId, parentId };
  }
  _besideDropFired = false;
}

export function getDragOrigin(): { nodeId: NodeId; parentId: NodeId | undefined } | null {
  return _dragOrigin;
}

export function setBesideDropFired() {
  _besideDropFired = true;
}

export function didBesideDropFire(): boolean {
  return _besideDropFired;
}

// ── Zone thresholds ────────────────────────────────────────────────────

const START_ZONE = 0.30;
const END_ZONE = 0.70;
const MIN_CONTAINER_SIZE = 200; // px — skip detection if container is too narrow/short

const SKIP_TYPES = new Set(["page", "header", "footer", "section"]);

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
  if (!parentDom) {
    console.log("[alignment-detect-skip] no parentDom");
    return null;
  }

  const parentType = parentNode?.data?.props?.type;
  if (SKIP_TYPES.has(parentType)) {
    console.log("[alignment-detect-skip] parent type:", parentType);
    return null;
  }

  const style = window.getComputedStyle(parentDom);
  const display = style.display;
  if (!display.includes("flex")) {
    console.log("[alignment-detect-skip] not flex:", display);
    return null;
  }

  const dir = style.flexDirection;
  const isCol = dir === "column" || dir === "column-reverse";
  const isRow = dir === "row" || dir === "row-reverse";
  if (!isCol && !isRow) {
    console.log("[alignment-detect-skip] unknown flex direction:", dir);
    return null;
  }

  const rect = parentDom.getBoundingClientRect();

  const relX = posX - rect.left;
  const relY = posY - rect.top;
  const hZone: AlignmentZone = rect.width >= MIN_CONTAINER_SIZE
    ? (relX / rect.width < START_ZONE ? "start" : relX / rect.width > END_ZONE ? "end" : "center")
    : "center";
  const vZone: AlignmentZone = rect.height >= MIN_CONTAINER_SIZE
    ? (relY / rect.height < START_ZONE ? "start" : relY / rect.height > END_ZONE ? "end" : "center")
    : "center";

  return {
    horizontal: hZone,
    vertical: vZone,
    flexDir: isCol ? "col" : "row",
  };
}

// ── Labels ─────────────────────────────────────────────────────────────

const H_LABELS: Record<AlignmentZone, string> = { start: "left", center: "center", end: "right" };
const V_LABELS: Record<AlignmentZone, string> = { start: "top", center: "middle", end: "bottom" };

export function getAlignmentPreviewLabel(intent: AlignmentIntent): string {
  const h = intent.horizontal;
  const v = intent.vertical;
  const hDefault = h === "center";
  const vDefault = v === "center";
  if (hDefault && vDefault) return "Align center";
  if (hDefault) return `Align ${V_LABELS[v]}`;
  if (vDefault) return `Align ${H_LABELS[h]}`;
  return `Align ${V_LABELS[v]}-${H_LABELS[h]}`;
}

// ── Wrapper classNames ────────────────────────────────────────────────

const JUSTIFY_CLASS: Record<AlignmentZone, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
};

const ITEMS_CLASS: Record<AlignmentZone, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
};

function buildWrapperClass(h: AlignmentZone, v: AlignmentZone): string {
  return `flex w-full self-stretch ${JUSTIFY_CLASS[h]} ${ITEMS_CLASS[v]}`;
}


// ── Drop handler ───────────────────────────────────────────────────────

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
  if (!node?.data) {
    console.log("[alignment-drop] skip — node not found", nodeId);
    return;
  }

  const hZone = intent.horizontal;
  const vZone = intent.vertical;
  const hNonDefault = hZone !== "center";
  const vNonDefault = vZone !== "center";

  const needsAlign = hNonDefault || vNonDefault;
  if (!needsAlign) {
    console.log("[alignment-drop] skip — both axes center");
    return;
  }

  const wrapperClassName = buildWrapperClass(hZone, vZone);

  console.log("[alignment-drop] intent", {
    nodeId,
    h: hZone,
    v: vZone,
    wrapperClassName,
    nodeName: node.data.name,
    nodeDisplayName: node.data.custom?.displayName,
    nodeClassName: node.data.props?.className,
    isAlignWrapper: isAlignWrapper(node),
    previousParentId,
  });

  // If the dragged node IS an Align wrapper, update its className
  if (isAlignWrapper(node)) {
    console.log("[alignment-drop] → update dragged wrapper", { from: node.data.props?.className, to: wrapperClassName });
    actions.setProp(nodeId, (props: Record<string, any>) => {
      props.className = wrapperClassName;
    });
    const after = query.node(nodeId).get();
    console.log("[alignment-drop] ✓ wrapper updated", { nodeId, className: after?.data?.props?.className, parent: after?.data?.parent });
    return;
  }

  const parentId = node.data.parent;
  if (!parentId) {
    console.log("[alignment-drop] skip — no parent");
    return;
  }

  const parentNode = query.node(parentId).get();
  if (!parentNode?.data) {
    console.log("[alignment-drop] skip — parent node not found", parentId);
    return;
  }

  const parentType = parentNode.data.props?.type;
  if (SKIP_TYPES.has(parentType)) {
    console.log("[alignment-drop] skip — parent type skipped:", parentType);
    return;
  }

  console.log("[alignment-drop] parent context", {
    parentId,
    parentName: parentNode.data.name,
    parentDisplayName: parentNode.data.custom?.displayName,
    parentClassName: parentNode.data.props?.className,
    parentType,
    parentChildCount: parentNode.data.nodes?.length,
    parentChildren: parentNode.data.nodes,
    isAlignWrapper: isAlignWrapper(parentNode),
  });

  // If already inside an Align wrapper, update its className
  if (isAlignWrapper(parentNode)) {
    console.log("[alignment-drop] → reuse parent wrapper", { from: parentNode.data.props?.className, to: wrapperClassName });
    actions.setProp(parentId, (props: Record<string, any>) => {
      props.className = wrapperClassName;
    });
    const after = query.node(parentId).get();
    console.log("[alignment-drop] ✓ parent wrapper updated", { parentId, className: after?.data?.props?.className });
    return;
  }

  // Clean up old wrapper if it's now empty (node moved out of it)
  // Handles both Align wrappers and Item wrappers from beside-drop
  if (previousParentId && previousParentId !== parentId) {
    const prevParent = query.node(previousParentId).get();
    const prevChildren = prevParent?.data?.nodes || [];
    const prevDisplayName = prevParent?.data?.custom?.displayName;
    const isEmptyWrapper = prevChildren.length === 0 &&
      prevParent?.data?.name === "Container" &&
      (prevDisplayName === "Align" || prevDisplayName === "Item");
    console.log("[alignment-drop] cleanup check", {
      previousParentId,
      prevDisplayName,
      prevChildCount: prevChildren.length,
      isEmptyWrapper,
    });
    if (isEmptyWrapper) {
      console.log("[alignment-drop] → delete empty wrapper", previousParentId);
      actions.delete(previousParentId);
    }
  }

  const nodeIndex = (parentNode.data.nodes || []).indexOf(nodeId);
  if (nodeIndex < 0) {
    console.log("[alignment-drop] skip — node not in parent children", { nodeId, parentChildren: parentNode.data.nodes });
    return;
  }

  console.log("[alignment-drop] → wrap node", { nodeId, parentId, nodeIndex, wrapperClassName });

  // Create wrapper — get Container from CraftJS resolver (same instance it knows)
  const resolver = query.getOptions().resolver;
  const ContainerComp = resolver?.Container;
  if (!ContainerComp) {
    console.log("[alignment-drop] skip — Container not in resolver");
    return;
  }
  const wrapperTree = query
    .parseReactElement(
      React.createElement(Element, {
        canvas: true,
        is: ContainerComp,
        canDelete: true,
        canEditName: true,
        className: wrapperClassName,
        custom: { displayName: "Align" },
      })
    )
    .toNodeTree();

  const wrapperId = wrapperTree.rootNodeId;
  const merged = actions.history.merge();
  actions.addNodeTree(wrapperTree, parentId, nodeIndex);
  merged.move([nodeId], wrapperId, 0);

  // Verify final state
  const finalNode = query.node(nodeId).get();
  const finalWrapper = query.node(wrapperId).get();
  console.log("[alignment-drop] ✓ wrapped", {
    nodeId,
    nodeParent: finalNode?.data?.parent,
    wrapperId,
    wrapperClassName: finalWrapper?.data?.props?.className,
    wrapperParent: finalWrapper?.data?.parent,
    wrapperChildren: finalWrapper?.data?.nodes,
  });
}
