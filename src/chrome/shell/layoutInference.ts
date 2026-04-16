/**
 * Layout inference: beside-drop detection + restructuring.
 *
 * besideDetector — passed to CraftJS Editor options, called by findPosition
 * during drag to detect horizontal intent in flex-col containers.
 *
 * onBesideDrop — called by CraftJS when a beside drop occurs. Wraps the
 * target sibling + dropped node in a new flex-row Container.
 */

import React from "react";
import { Element, type DragTarget, type Indicator, type Node, type NodeId, type NodeInfo } from "@craftjs/core";
import { setBesideDropFired } from "./alignmentInference";

const BESIDE_ZONE = 0.22;
const BESIDE_MIN_EDGE_PX = 28;
const BESIDE_MAX_EDGE_PX = 96;
const BESIDE_VERTICAL_GUTTER_RATIO = 0.18;
const BESIDE_MIN_WIDTH = 160;
const SKIP_TYPES = new Set(["page", "header", "footer", "section"]);
const ROW_CLASSNAME = "flex flex-row flex-wrap gap-space-md items-start min-w-0 w-full";
const PROMOTED_ROW_CLASSNAME = "flex flex-row flex-nowrap gap-space-md items-start min-w-0 w-full";
const WRAPPER_CLASSNAME = "flex min-w-0 flex-1 basis-0 flex-col gap-4";
const PROMOTED_TARGET_WRAPPER_CLASSNAME = "flex min-w-0 flex-1 basis-0 flex-col gap-4";
const PROMOTED_DRAGGED_WRAPPER_CLASSNAME = "flex min-w-0 shrink-0 flex-col gap-4";
const CENTER_ALIGNMENT_TOKENS = [
  "items-center",
  "justify-center",
  "text-center",
  "mx-auto",
  "place-items-center",
  "content-center",
];
const SIDE_ALIGNMENT_CLASSNAME: Record<BesideSide, string> = {
  "beside-left": "items-start text-left",
  "beside-right": "items-end text-right",
};

type BesideSide = "beside-left" | "beside-right";

function isContainerLike(node: Pick<Node, "data"> | undefined | null) {
  if (!node?.data) return false;
  return !!node.data.isCanvas || node.data.name === "Container";
}

function getClassName(node: Pick<Node, "data"> | undefined | null) {
  const className = node?.data?.props?.className;
  return typeof className === "string" ? className : "";
}

function hasFullWidthClass(className: string) {
  return /(^|\s)(w-full|min-w-full)(\s|$)/.test(className);
}

function hasStackClass(className: string) {
  return hasToken(className, "flex") && (hasToken(className, "flex-col") || hasToken(className, "flex-col-reverse"));
}

function stripCenteredLayoutTokens(className: string) {
  if (!className) return className;

  return className
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      (token) =>
        ![
          "items-center",
          "justify-center",
          "text-center",
          "mx-auto",
          "place-items-center",
          "content-center",
          "w-full",
          "min-w-full",
        ].includes(token)
    )
    .join(" ");
}

function hasToken(className: string, token: string) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}(\\s|$)`).test(className);
}

function getCenterAlignmentScore(node: Pick<Node, "data"> | undefined | null) {
  const className = getClassName(node);
  return CENTER_ALIGNMENT_TOKENS.reduce((score, token) => score + (hasToken(className, token) ? 1 : 0), 0);
}

function shouldPreserveCenteredContent(node: Pick<Node, "data"> | undefined | null) {
  return getCenterAlignmentScore(node) >= 2;
}

function buildWrapperClassName(
  node: Pick<Node, "data"> | undefined | null,
  side?: BesideSide,
  mode: "default" | "promoted-target" | "promoted-dragged" = "default"
) {
  const baseClassName =
    mode === "promoted-target"
      ? PROMOTED_TARGET_WRAPPER_CLASSNAME
      : mode === "promoted-dragged"
        ? PROMOTED_DRAGGED_WRAPPER_CLASSNAME
        : WRAPPER_CLASSNAME;

  if (!shouldPreserveCenteredContent(node)) return baseClassName;
  if (side) return `${baseClassName} ${SIDE_ALIGNMENT_CLASSNAME[side]}`;
  return `${baseClassName} items-center text-center`;
}

function buildRowClassName(
  side: BesideSide | undefined,
  nodes: Array<Pick<Node, "data"> | undefined | null>,
  mode: "default" | "promoted" = "default"
) {
  const baseClassName = mode === "promoted" ? PROMOTED_ROW_CLASSNAME : ROW_CLASSNAME;
  const centeredNodes = nodes.filter((node) => shouldPreserveCenteredContent(node)).length;
  if (centeredNodes < 2) return baseClassName;
  if (side === "beside-right") {
    return baseClassName.replace("items-start", "items-end");
  }
  if (side === "beside-left") {
    return baseClassName;
  }
  return baseClassName.replace("items-start", "items-center");
}

function shouldWrapBesideChild(node: Pick<Node, "data"> | undefined | null) {
  if (!node?.data) return true;
  // Leaf components (Button, Text, Image, etc.) should always be wrapped
  // even if they're canvas nodes (e.g. Button is canvas for icon children)
  const name = node.data.name;
  if (name !== "Container") return true;
  return hasFullWidthClass(getClassName(node));
}

function isSimpleBesideRow(node: Pick<Node, "data"> | undefined | null) {
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

function resolveBesideTargetContext(query: any, parentNode: Node, targetNode: Node) {
  let currentTargetNode = targetNode;
  let currentParentNode = parentNode;
  const promotionTrail: Array<Record<string, any>> = [];

  while (currentParentNode?.data?.parent) {
    const promotable = isLayoutRootCandidate(query, currentParentNode, currentTargetNode);
    promotionTrail.push({
      currentTargetNodeId: currentTargetNode?.id,
      currentParentNodeId: currentParentNode?.id,
      currentParentType: currentParentNode?.data?.props?.type || null,
      currentParentChildCount: currentParentNode?.data?.nodes?.length || 0,
      currentParentClassName: getClassName(currentParentNode),
      promotable,
    });

    if (promotable) {
      const nextParentId = currentParentNode.data.parent;
      const nextParentNode = nextParentId ? query.node(nextParentId).get() : null;
      console.log("[beside-drop] promotion-trail", promotionTrail);
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

  console.log("[beside-drop] promotion-trail", promotionTrail);

  return { targetNode, parentNode };
}

function getReusableRowContext(query: any, parentNode: Node, targetNode: Node) {
  if (!parentNode?.data?.parent) return null;
  const rowNode = query.node(parentNode.data.parent).get();
  if (!isSimpleBesideRow(rowNode)) return null;
  const wrapperChildCount = parentNode.data.nodes?.length || 0;
  if (wrapperChildCount !== 1) return null;
  if (parentNode.id !== targetNode.data.parent) return null;
  return { rowNode, anchorNode: parentNode };
}

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

function makeContainerTree(
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

function addTree(actions: any, tree: any, parentId: NodeId, index: number, merged: any, isFirstRef: { value: boolean }) {
  if (isFirstRef.value) {
    actions.addNodeTree(tree, parentId, index);
    isFirstRef.value = false;
  } else {
    merged.addNodeTree(tree, parentId, index);
  }
}

function moveNode(
  actions: any,
  selector: NodeId | NodeId[],
  parentId: NodeId,
  index: number,
  merged: any,
  isFirstRef: { value: boolean }
) {
  if (isFirstRef.value) {
    actions.move(selector, parentId, index);
    isFirstRef.value = false;
  } else {
    merged.move(selector, parentId, index);
  }
}

function addNewTreeIntoSlot(
  actions: any,
  merged: any,
  isFirstRef: { value: boolean },
  tree: any,
  rowId: NodeId,
  slotIndex: number,
  wrapperClassName: string | null,
  query: any,
  ContainerComponent: React.ComponentType<any>
) {
  if (!wrapperClassName) {
    addTree(actions, tree, rowId, slotIndex, merged, isFirstRef);
    return;
  }

  const wrapperTree = makeContainerTree(query, ContainerComponent, wrapperClassName, "Item");
  addTree(actions, wrapperTree, rowId, slotIndex, merged, isFirstRef);
  addTree(actions, tree, wrapperTree.rootNodeId, 0, merged, isFirstRef);
}

function moveExistingIntoSlot(
  actions: any,
  merged: any,
  isFirstRef: { value: boolean },
  nodeIds: NodeId[],
  rowId: NodeId,
  slotIndex: number,
  wrapperClassName: string | null,
  query: any,
  ContainerComponent: React.ComponentType<any>
) {
  if (!wrapperClassName) {
    moveNode(actions, nodeIds, rowId, slotIndex, merged, isFirstRef);
    return;
  }

  const wrapperTree = makeContainerTree(query, ContainerComponent, wrapperClassName, "Item");
  addTree(actions, wrapperTree, rowId, slotIndex, merged, isFirstRef);
  moveNode(actions, nodeIds, wrapperTree.rootNodeId, 0, merged, isFirstRef);
}

function deleteNode(
  actions: any,
  merged: any,
  isFirstRef: { value: boolean },
  nodeId: NodeId
) {
  if (isFirstRef.value) {
    actions.delete(nodeId);
    isFirstRef.value = false;
  } else {
    merged.delete(nodeId);
  }
}

function patchNodeClassName(
  actions: any,
  merged: any,
  isFirstRef: { value: boolean },
  nodeId: NodeId,
  className: string
) {
  if (isFirstRef.value) {
    actions.setProp(nodeId, (props: Record<string, any>) => {
      props.className = className;
    });
    isFirstRef.value = false;
  } else {
    merged.setProp(nodeId, (props: Record<string, any>) => {
      props.className = className;
    });
  }
}

function normalizePromotedTargetBranch(
  actions: any,
  merged: any,
  isFirstRef: { value: boolean },
  query: any,
  nodeId: NodeId
) {
  const targetNode = query.node(nodeId).get();
  if (!targetNode?.data) return;

  const targetClassName = getClassName(targetNode);
  const nextTargetClassName = stripCenteredLayoutTokens(targetClassName);
  if (nextTargetClassName !== targetClassName) {
    patchNodeClassName(actions, merged, isFirstRef, nodeId, nextTargetClassName);
  }

  const firstChildId = targetNode.data.nodes?.[0];
  if (!firstChildId) return;

  const firstChildNode = query.node(firstChildId).get();
  if (!firstChildNode?.data) return;

  const firstChildClassName = getClassName(firstChildNode);
  const nextChildClassName = stripCenteredLayoutTokens(firstChildClassName);
  if (nextChildClassName !== firstChildClassName) {
    patchNodeClassName(actions, merged, isFirstRef, firstChildId, nextChildClassName);
  }
}

function movePromotedTargetIntoFreshSlot(
  actions: any,
  merged: any,
  isFirstRef: { value: boolean },
  targetNode: Node,
  rowId: NodeId,
  slotIndex: number,
  side: BesideSide,
  query: any,
  ContainerComponent: React.ComponentType<any>
) {
  const childIds = [...(targetNode.data.nodes || [])];

  if (childIds.length === 0) {
    moveExistingIntoSlot(
      actions,
      merged,
      isFirstRef,
      [targetNode.id],
      rowId,
      slotIndex,
      buildWrapperClassName(targetNode, side, "promoted-target"),
      query,
      ContainerComponent
    );
    return;
  }

  const wrapperTree = makeContainerTree(
    query,
    ContainerComponent,
    buildWrapperClassName(targetNode, side, "promoted-target"),
    "Item"
  );
  addTree(actions, wrapperTree, rowId, slotIndex, merged, isFirstRef);
  moveNode(actions, childIds, wrapperTree.rootNodeId, 0, merged, isFirstRef);
  deleteNode(actions, merged, isFirstRef, targetNode.id);

  const firstChildId = childIds[0];
  const firstChildNode = query.node(firstChildId).get();
  if (!firstChildNode?.data) return;

  const firstChildClassName = getClassName(firstChildNode);
  const nextChildClassName = stripCenteredLayoutTokens(firstChildClassName);
  if (nextChildClassName !== firstChildClassName) {
    patchNodeClassName(actions, merged, isFirstRef, firstChildId, nextChildClassName);
  }
}

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

/**
 * Called by CraftJS on drop when placement.where is "beside-left" or "beside-right".
 * Wraps the target sibling and the dragged node(s) in a new Row container.
 */
export function onBesideDrop(ContainerComponent: React.ComponentType<any>) {
  return (dragTarget: DragTarget, indicator: Indicator, actions: any, query: any) => {
    const { parent, where, currentNode } = indicator.placement;
    if (!currentNode) return;
    if (where !== "beside-left" && where !== "beside-right") return;

    const side = where as BesideSide;
    setBesideDropFired();
    const parentId = parent.id;
    const targetNode = query.node(currentNode.id).get();
    if (!targetNode) return;

    if (dragTarget.type === "existing" && dragTarget.nodes.includes(targetNode.id)) {
      return;
    }

    if (
      dragTarget.type === "existing" &&
      dragTarget.nodes.some((nodeId) => query.node(nodeId).descendants(true).includes(targetNode.id))
    ) {
      return;
    }

    const initialParentNode = query.node(parentId).get();
    const resolvedContext = resolveBesideTargetContext(
      query,
      initialParentNode,
      targetNode
    );
    const resolvedParentType = resolvedContext.parentNode?.data?.props?.type;
    const shouldRejectPromotion =
      resolvedContext.targetNode.id !== targetNode.id && SKIP_TYPES.has(resolvedParentType);
    const { parentNode, targetNode: effectiveTargetNode } = shouldRejectPromotion
      ? { parentNode: initialParentNode, targetNode }
      : resolvedContext;
    const usedPromotedTarget = effectiveTargetNode.id !== targetNode.id;
    const effectiveParentId = parentNode.id;
    const reusableRow = getReusableRowContext(query, parentNode, effectiveTargetNode);
    const draggedPreviewNode =
      dragTarget.type === "existing"
        ? dragTarget.nodes.map((nodeId) => query.node(nodeId).get()).filter(Boolean)[0]
        : dragTarget.tree?.nodes?.[dragTarget.tree.rootNodeId];

    console.log("[beside-drop] start", {
      side,
      dragType: dragTarget.type,
      parentId,
      initialParentId: initialParentNode?.id,
      targetNodeId: targetNode.id,
      effectiveParentId,
      effectiveTargetNodeId: effectiveTargetNode.id,
      usedPromotedTarget,
      reusableRowId: reusableRow?.rowNode?.id || null,
      targetClassName: getClassName(targetNode),
      effectiveTargetClassName: getClassName(effectiveTargetNode),
      parentClassName: getClassName(parentNode),
      draggedPreviewNodeId: draggedPreviewNode?.id || null,
      draggedPreviewClassName: getClassName(draggedPreviewNode),
    });

    if (reusableRow) {
      const rowId = reusableRow.rowNode.id;
      const anchorIndex = (reusableRow.rowNode.data.nodes || []).indexOf(reusableRow.anchorNode.id);
      if (anchorIndex < 0) return;

      const insertIndex = side === "beside-left" ? anchorIndex : anchorIndex + 1;
      const merged = actions.history.merge();
      const isFirstRef = { value: true };

      console.log("[beside-drop] reuse-row", {
        rowId,
        anchorNodeId: reusableRow.anchorNode.id,
        insertIndex,
      });

      if (dragTarget.type === "existing") {
        moveExistingIntoSlot(
          actions,
          merged,
          isFirstRef,
          dragTarget.nodes,
          rowId,
          insertIndex,
          shouldWrapBesideChild(draggedPreviewNode)
            ? buildWrapperClassName(
                draggedPreviewNode,
                side,
                usedPromotedTarget ? "promoted-dragged" : "default"
              )
            : null,
          query,
          ContainerComponent
        );
      } else {
        addNewTreeIntoSlot(
          actions,
          merged,
          isFirstRef,
          dragTarget.tree,
          rowId,
          insertIndex,
          shouldWrapBesideChild(draggedPreviewNode)
            ? buildWrapperClassName(
                draggedPreviewNode,
                side,
                usedPromotedTarget ? "promoted-dragged" : "default"
              )
            : null,
          query,
          ContainerComponent
        );
      }

      actions.selectNode(rowId);
      return;
    }

    const targetIndex = (parentNode.data.nodes || []).indexOf(effectiveTargetNode.id);
    if (targetIndex < 0) return;

    const rowTree = makeContainerTree(
      query,
      ContainerComponent,
      buildRowClassName(
        side,
        [parentNode, effectiveTargetNode, draggedPreviewNode],
        usedPromotedTarget ? "promoted" : "default"
      ),
      "Row"
    );
    const rowId = rowTree.rootNodeId;
    const merged = actions.history.merge();
    const isFirstRef = { value: true };

    console.log("[beside-drop] create-row", {
      rowId,
      effectiveParentId,
      targetIndex,
      usedPromotedTarget,
      targetSlotIndex: side === "beside-left" ? 1 : 0,
      draggedSlotIndex: side === "beside-left" ? 0 : 1,
      rowClassName: buildRowClassName(
        side,
        [parentNode, effectiveTargetNode, draggedPreviewNode],
        usedPromotedTarget ? "promoted" : "default"
      ),
    });

    addTree(actions, rowTree, effectiveParentId, targetIndex, merged, isFirstRef);

    const targetSlotIndex = side === "beside-left" ? 1 : 0;
    const draggedSlotIndex = side === "beside-left" ? 0 : 1;

    if (usedPromotedTarget) {
      console.log("[beside-drop] promoted-target-fresh-slot", {
        effectiveTargetNodeId: effectiveTargetNode.id,
        targetChildIds: effectiveTargetNode.data.nodes || [],
      });
      movePromotedTargetIntoFreshSlot(
        actions,
        merged,
        isFirstRef,
        effectiveTargetNode,
        rowId,
        targetSlotIndex,
        side,
        query,
        ContainerComponent
      );
    } else {
      moveExistingIntoSlot(
        actions,
        merged,
        isFirstRef,
        [effectiveTargetNode.id],
        rowId,
        targetSlotIndex,
        shouldWrapBesideChild(effectiveTargetNode)
          ? buildWrapperClassName(effectiveTargetNode, side, "default")
          : null,
        query,
        ContainerComponent
      );
    }

    if (dragTarget.type === "existing") {
      const draggedNodes = dragTarget.nodes.map((nodeId) => query.node(nodeId).get()).filter(Boolean);
      if (draggedNodes.length === 0) return;

      const shouldWrapDragged =
        draggedNodes.length > 1 || shouldWrapBesideChild(draggedNodes[0]);

      console.log("[beside-drop] existing-dragged", {
        draggedNodeIds: dragTarget.nodes,
        draggedName: draggedNodes[0]?.data?.name,
        draggedDisplayName: draggedNodes[0]?.data?.custom?.displayName,
        draggedClassName: getClassName(draggedNodes[0]),
        isContainerLike: isContainerLike(draggedNodes[0]),
        shouldWrapDragged,
      });

      moveExistingIntoSlot(
        actions,
        merged,
        isFirstRef,
        dragTarget.nodes,
        rowId,
        draggedSlotIndex,
        shouldWrapDragged
          ? buildWrapperClassName(
              draggedNodes[0],
              side,
              usedPromotedTarget ? "promoted-dragged" : "default"
            )
          : null,
        query,
        ContainerComponent
      );
    } else {
      const draggedRoot = dragTarget.tree?.nodes?.[dragTarget.tree.rootNodeId];
      console.log("[beside-drop] new-dragged", {
        draggedRootId: draggedRoot?.id || dragTarget.tree?.rootNodeId || null,
        shouldWrapDragged: shouldWrapBesideChild(draggedRoot),
      });
      addNewTreeIntoSlot(
        actions,
        merged,
        isFirstRef,
        dragTarget.tree,
        rowId,
        draggedSlotIndex,
        shouldWrapBesideChild(draggedRoot)
          ? buildWrapperClassName(
              draggedRoot,
              side,
              usedPromotedTarget ? "promoted-dragged" : "default"
            )
          : null,
        query,
        ContainerComponent
      );
    }

    console.log("[beside-drop] done", {
      rowId,
      selectedNodeId: rowId,
    });
    actions.selectNode(rowId);
  };
}
