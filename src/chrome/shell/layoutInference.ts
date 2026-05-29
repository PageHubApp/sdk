/**
 * Layout inference: beside-drop helpers + shared node utilities.
 * Beside *placement* during drag lives in findPosition2D → spatial/detectBeside.ts.
 */

import React from "react";
import { Element, type Node, type NodeId } from "@craftjs/core";
import { sdkLog } from "../../utils/logger";

// ── Debug logging (dev only) ──────────────────────────────────────────

const isDev = process.env.NODE_ENV === "development";
const log = isDev
  ? (label: string, data?: Record<string, any>) => sdkLog.log(`[beside] ${label}`, data ?? "")
  : () => {};

// ── Types ─────────────────────────────────────────────────────────────

export type BesideSide = "beside-left" | "beside-right";

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
  return (
    hasToken(className, "flex") &&
    (hasToken(className, "flex-col") || hasToken(className, "flex-col-reverse"))
  );
}

function getCenterAlignmentScore(node: Pick<Node, "data"> | undefined | null) {
  const className = getClassName(node);
  return CENTER_ALIGNMENT_TOKENS.reduce(
    (score, token) => score + (hasToken(className, token) ? 1 : 0),
    0
  );
}

export function shouldPreserveCenteredContent(node: Pick<Node, "data"> | undefined | null) {
  return getCenterAlignmentScore(node) >= 2;
}

/** Unprefixed or breakpoint `flex-row` (button-group / nav strips often use `sm:flex-row`). */
export function hasDeclaredFlexRow(className: string) {
  if (!className) return false;
  if (hasToken(className, "flex-row")) return true;
  return /\b(?:sm|md|lg|xl|2xl):flex-row\b/.test(className);
}

export function isSimpleBesideRow(node: Pick<Node, "data"> | undefined | null) {
  if (!node?.data) return false;
  const className = getClassName(node);
  const childCount = node.data.nodes?.length || 0;
  return (
    isContainerLike(node) &&
    hasToken(className, "flex") &&
    hasDeclaredFlexRow(className) &&
    childCount >= 2 &&
    childCount <= 3
  );
}

/**
 * Beside-right/left on this node should stay a local split (new Row under the column parent),
 * not promote to "Split content" (whole stack vs sibling at grandparent). Typical failure:
 * dragging a hero CTA beside a sibling button-group row promoted the entire "Hero copy" column vs the image.
 */
export function isBesidePromotionLeafTarget(node: Pick<Node, "data"> | undefined | null) {
  if (!node?.data) return false;
  return isSimpleBesideRow(node);
}

const BESIDE_WRAPPER_DISPLAY_NAMES = new Set(["Row", "Item", "Align"]);

export function isBesideWrapper(node: Pick<Node, "data"> | undefined | null): boolean {
  if (!node?.data) return false;
  return isContainerLike(node) && BESIDE_WRAPPER_DISPLAY_NAMES.has(node.data.custom?.displayName);
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

// Layout utility components excluded from meaningful child counts
const LAYOUT_UTILITY_NAMES = new Set<string>();
const LAYOUT_WRAPPER_DISPLAY_NAMES = new Set(["Row", "Item"]);

function isMeaningfulChild(query: any, nodeId: NodeId) {
  const node = query.node(nodeId).get();
  if (!node?.data) return false;
  if (LAYOUT_UTILITY_NAMES.has(node.data.name)) return false;
  if (LAYOUT_WRAPPER_DISPLAY_NAMES.has(node.data.custom?.displayName)) return false;
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
  if (LAYOUT_WRAPPER_DISPLAY_NAMES.has(displayName)) return false;
  if (hasToken(className, "flex-row") || hasDeclaredFlexRow(className)) return false;

  const nonContainerChildCount = childIds.filter((nodeId: NodeId) => {
    const child = query.node(nodeId).get();
    return child?.data ? !isContainerLike(child) : false;
  }).length;

  return (
    childCount <= 6 &&
    childCount >= 2 &&
    (hasStackClass(className) ||
      shouldPreserveCenteredContent(node) ||
      nonContainerChildCount >= 2 ||
      !isContainerLike(childNode))
  );
}

// ── Promotion resolution ──────────────────────────────────────────────

export function resolveBesideTargetContext(query: any, parentNode: Node, targetNode: Node) {
  if (isBesidePromotionLeafTarget(targetNode)) {
    return { targetNode, parentNode };
  }

  let currentTargetNode = targetNode;
  let currentParentNode = parentNode;

  let depth = 0;
  while (currentParentNode?.data?.parent && ++depth <= 10) {
    const promotable = isLayoutRootCandidate(query, currentParentNode, currentTargetNode);

    log("promotion-check", {
      parentId: currentParentNode.id,
      targetId: currentTargetNode.id,
      parentType: currentParentNode.data?.props?.type ?? null,
      childCount: currentParentNode.data?.nodes?.length ?? 0,
      className: getClassName(currentParentNode),
      promotable,
    });

    if (promotable) {
      const nextParentId = currentParentNode.data.parent;
      const nextParentNode = nextParentId ? query.node(nextParentId).get() : null;
      log("promoted", { to: currentParentNode.id, newParent: nextParentNode?.id ?? null });
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
  if (parentNode.id !== targetNode.data.parent) return null;
  return { rowNode, anchorNode: parentNode };
}

// ── Preview label ─────────────────────────────────────────────────────

export function getBesidePreviewLabel(query: any, parentNode: Node, targetNode: Node) {
  const { parentNode: effectiveParentNode, targetNode: effectiveTargetNode } =
    resolveBesideTargetContext(query, parentNode, targetNode);

  if (getReusableRowContext(query, effectiveParentNode, effectiveTargetNode)) {
    return "Insert into row";
  }

  if (effectiveTargetNode.id !== targetNode.id) {
    return "Split content";
  }

  return "Create split";
}
