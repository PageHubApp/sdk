/**
 * Layout inference: beside-drop detection + shared helpers.
 *
 * besideDetector — passed to CraftJS Editor options, called by findPosition
 * during drag to detect horizontal intent in flex-col containers.
 *
 * Shared helpers are exported for use by besideDrop.ts and alignmentInference.ts.
 */

import React from "react";
import { Element, type Node, type NodeId, type NodeInfo } from "@craftjs/core";

// ── Types ─────────────────────────────────────────────────────────────

export type BesideSide = "beside-left" | "beside-right";

// ── Constants ─────────────────────────────────────────────────────────

const BESIDE_ZONE = 0.22;
const BESIDE_MIN_EDGE_PX = 28;
const BESIDE_MAX_EDGE_PX = 96;
const BESIDE_VERTICAL_GUTTER_RATIO = 0.18;
const BESIDE_MIN_WIDTH = 160;

export const SKIP_TYPES = new Set(["page", "header", "footer", "section"]);

const CENTER_ALIGNMENT_TOKENS = [
  "items-center",
  "justify-center",
  "text-center",
  "mx-auto",
  "place-items-center",
  "content-center",
];

// ── Shared node helpers ───────────────────────────────────────────────

export function isContainerLike(node: Pick<Node, "data"> | undefined | null) {
  if (!node?.data) return false;
  return !!node.data.isCanvas || node.data.name === "Container";
}

export function getClassName(node: Pick<Node, "data"> | undefined | null) {
  const className = node?.data?.props?.className;
  return typeof className === "string" ? className : "";
}

export function hasToken(className: string, token: string) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(className);
}

export function hasFullWidthClass(className: string) {
  return /(^|\s)(w-full|min-w-full)(\s|$)/.test(className);
}

export function hasStackClass(className: string) {
  return hasToken(className, "flex") && (hasToken(className, "flex-col") || hasToken(className, "flex-col-reverse"));
}

function getCenterAlignmentScore(node: Pick<Node, "data"> | undefined | null) {
  const className = getClassName(node);
  return CENTER_ALIGNMENT_TOKENS.reduce((score, token) => score + (hasToken(className, token) ? 1 : 0), 0);
}

export function shouldPreserveCenteredContent(node: Pick<Node, "data"> | undefined | null) {
  return getCenterAlignmentScore(node) >= 2;
}

export function isSimpleBesideRow(node: Pick<Node, "data"> | undefined | null) {
  if (!node?.data) return false;
  const className = getClassName(node);
  const childCount = node.data.nodes?.length || 0;
  return (
    isContainerLike(node) &&
    hasToken(className, "flex") &&
    hasToken(className, "flex-row") &&
    childCount >= 2 &&
    childCount <= 3
  );
}

// ── Container tree factory (shared with alignmentInference) ───────────

export function makeContainerTree(
  query: any,
  ContainerComponent: React.ComponentType<any>,
  className: string,
  displayName: string
) {
  return query
    .parseReactElement(
      React.createElement(Element, {
        canvas: true,
        is: ContainerComponent,
        canDelete: true,
        canEditName: true,
        className,
        custom: { displayName },
      })
    )
    .toNodeTree();
}

// ── Internal helpers for promotion resolution ─────────────────────────

function isMeaningfulChild(query: any, nodeId: NodeId) {
  const node = query.node(nodeId).get();
  if (!node?.data) return false;
  const name = node.data.name;
  const displayName = node.data.custom?.displayName;
  if (name === "Spacer" || name === "Divider") return false;
  if (displayName === "Row" || displayName === "Item") return false;
  return true;
}

function getMeaningfulChildIds(query: any, node: Pick<Node, "data"> | undefined | null) {
  const childIds = node?.data?.nodes || [];
  return childIds.filter((nodeId: NodeId) => isMeaningfulChild(query, nodeId));
}

function isLayoutRootCandidate(
  query: any,
  node: Pick<Node, "data"> | undefined | null,
  childNode?: Pick<Node, "data"> | undefined | null
) {
  if (!node?.data) return false;
  if (!isContainerLike(node)) return false;
  if (isSimpleBesideRow(node)) return false;

  const className = getClassName(node);
  const childIds = getMeaningfulChildIds(query, node);
  const childCount = childIds.length;
  const nodeType = node.data.props?.type;
  const displayName = node.data.custom?.displayName;
  if (SKIP_TYPES.has(nodeType)) return false;
  if (displayName === "Row" || displayName === "Item") return false;
  if (hasToken(className, "flex-row")) return false;

  const nonContainerChildCount = childIds.filter((nodeId: NodeId) => {
    const child = query.node(nodeId).get();
    return child?.data ? !isContainerLike(child) : false;
  }).length;

  return (
    childCount <= 6 &&
    childCount >= 2 &&
    (
      hasStackClass(className) ||
      shouldPreserveCenteredContent(node) ||
      nonContainerChildCount >= 2 ||
      !isContainerLike(childNode)
    )
  );
}

// ── Promotion resolution ──────────────────────────────────────────────

export function resolveBesideTargetContext(query: any, parentNode: Node, targetNode: Node) {
  let currentTargetNode = targetNode;
  let currentParentNode = parentNode;

  while (currentParentNode?.data?.parent) {
    const promotable = isLayoutRootCandidate(query, currentParentNode, currentTargetNode);

    if (promotable) {
      const nextParentId = currentParentNode.data.parent;
      const nextParentNode = nextParentId ? query.node(nextParentId).get() : null;
      return {
        targetNode: currentParentNode,
        parentNode: nextParentNode?.data ? nextParentNode : parentNode,
      };
    }

    const nextParentId = currentParentNode.data.parent;
    if (!nextParentId) break;

    const nextParentNode = query.node(nextParentId).get();
    if (!nextParentNode?.data) break;

    const nextParentType = nextParentNode.data.props?.type;
    if (SKIP_TYPES.has(nextParentType)) break;
    if (isSimpleBesideRow(nextParentNode)) break;

    currentTargetNode = currentParentNode;
    currentParentNode = nextParentNode;
  }

  return { targetNode, parentNode };
}

export function getReusableRowContext(query: any, parentNode: Node, targetNode: Node) {
  if (!parentNode?.data?.parent) return null;
  const rowNode = query.node(parentNode.data.parent).get();
  if (!isSimpleBesideRow(rowNode)) return null;
  const wrapperChildCount = parentNode.data.nodes?.length || 0;
  if (wrapperChildCount !== 1) return null;
  if (parentNode.id !== targetNode.data.parent) return null;
  return { rowNode, anchorNode: parentNode };
}

// ── Preview label ─────────────────────────────────────────────────────

export function getBesidePreviewLabel(query: any, parentNode: Node, targetNode: Node) {
  const { parentNode: effectiveParentNode, targetNode: effectiveTargetNode } = resolveBesideTargetContext(
    query,
    parentNode,
    targetNode
  );

  if (getReusableRowContext(query, effectiveParentNode, effectiveTargetNode)) {
    return "Insert into row";
  }

  if (effectiveTargetNode.id !== targetNode.id) {
    return "Split content";
  }

  return "Create split";
}

// ── Beside detector ───────────────────────────────────────────────────

/**
 * Called by CraftJS findPosition for each in-flow child during drag.
 */
export function besideDetector(
  parent: Node,
  childDim: NodeInfo,
  posX: number,
  posY: number
): BesideSide | null {
  const parentDom = parent.dom;
  if (!parentDom) return null;
  if (!childDim.inFlow) return null;

  const parentType = parent.data?.props?.type;
  if (SKIP_TYPES.has(parentType)) return null;

  const style = window.getComputedStyle(parentDom);
  const dir = style.flexDirection;
  if (dir !== "column" && dir !== "column-reverse") return null;

  const relX = posX - childDim.left;
  const relY = posY - childDim.top;
  const w = childDim.outerWidth;
  const h = childDim.outerHeight;
  if (w <= 0) return null;
  if (w < BESIDE_MIN_WIDTH) return null;

  const parentRect = parentDom.getBoundingClientRect();
  const withinChildX = relX >= 0 && relX <= w;
  const withinChildY = relY >= 0 && relY <= h;
  const withinParentX = posX >= parentRect.left && posX <= parentRect.right;
  const withinParentY = posY >= childDim.top && posY <= childDim.bottom;
  if ((!withinChildX || !withinChildY) && (!withinParentX || !withinParentY)) return null;

  // Keep reorder semantics near the top and bottom edge of a stacked item.
  const verticalGutter = Math.min(Math.max(h * BESIDE_VERTICAL_GUTTER_RATIO, 18), 56);
  if (relY < verticalGutter || relY > h - verticalGutter) return null;

  // Use a clamped edge band so wide cards don't become "beside" too eagerly.
  const edgeBand = Math.min(Math.max(w * BESIDE_ZONE, BESIDE_MIN_EDGE_PX), BESIDE_MAX_EDGE_PX);
  if (relX <= edgeBand) return "beside-left";
  if (relX >= w - edgeBand) return "beside-right";

  const leftWhitespace = Math.max(0, childDim.left - parentRect.left);
  const rightWhitespace = Math.max(0, parentRect.right - childDim.right);
  const externalBand = Math.min(Math.max(Math.min(leftWhitespace, rightWhitespace, edgeBand), 24), 120);

  if (
    posX < childDim.left &&
    leftWhitespace >= 32 &&
    posX >= childDim.left - externalBand
  ) {
    return "beside-left";
  }

  if (
    posX > childDim.right &&
    rightWhitespace >= 32 &&
    posX <= childDim.right + externalBand
  ) {
    return "beside-right";
  }

  return null;
}
