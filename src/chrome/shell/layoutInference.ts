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

const BESIDE_ZONE = 0.22;
const BESIDE_MIN_EDGE_PX = 28;
const BESIDE_MAX_EDGE_PX = 96;
const BESIDE_VERTICAL_GUTTER_RATIO = 0.18;
const BESIDE_MIN_WIDTH = 160;
const SKIP_TYPES = new Set(["page", "header", "footer"]);
const ROW_CLASSNAME = "flex flex-row flex-wrap gap-space-md items-start min-w-0 w-full";
const WRAPPER_CLASSNAME = "flex min-w-0 flex-1 basis-0 flex-col gap-4";

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

function shouldWrapBesideChild(node: Pick<Node, "data"> | undefined | null) {
  if (!node?.data) return true;
  if (!isContainerLike(node)) return true;
  return hasFullWidthClass(getClassName(node));
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
  wrapInItem: boolean,
  query: any,
  ContainerComponent: React.ComponentType<any>
) {
  if (!wrapInItem) {
    addTree(actions, tree, rowId, slotIndex, merged, isFirstRef);
    return;
  }

  const wrapperTree = makeContainerTree(query, ContainerComponent, WRAPPER_CLASSNAME, "Item");
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
  wrapInItem: boolean,
  query: any,
  ContainerComponent: React.ComponentType<any>
) {
  if (!wrapInItem) {
    moveNode(actions, nodeIds, rowId, slotIndex, merged, isFirstRef);
    return;
  }

  const wrapperTree = makeContainerTree(query, ContainerComponent, WRAPPER_CLASSNAME, "Item");
  addTree(actions, wrapperTree, rowId, slotIndex, merged, isFirstRef);
  moveNode(actions, nodeIds, wrapperTree.rootNodeId, 0, merged, isFirstRef);
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

  if (relX < 0 || relX > w || relY < 0 || relY > h) return null;

  // Keep reorder semantics near the top and bottom edge of a stacked item.
  const verticalGutter = Math.min(Math.max(h * BESIDE_VERTICAL_GUTTER_RATIO, 18), 56);
  if (relY < verticalGutter || relY > h - verticalGutter) return null;

  // Use a clamped edge band so wide cards don't become "beside" too eagerly.
  const edgeBand = Math.min(Math.max(w * BESIDE_ZONE, BESIDE_MIN_EDGE_PX), BESIDE_MAX_EDGE_PX);
  if (relX <= edgeBand) return "beside-left";
  if (relX >= w - edgeBand) return "beside-right";

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

    const parentNode = query.node(parentId).get();
    const targetIndex = (parentNode.data.nodes || []).indexOf(targetNode.id);
    if (targetIndex < 0) return;

    const rowTree = makeContainerTree(query, ContainerComponent, ROW_CLASSNAME, "Row");
    const rowId = rowTree.rootNodeId;
    const merged = actions.history.merge();
    const isFirstRef = { value: true };

    addTree(actions, rowTree, parentId, targetIndex, merged, isFirstRef);

    const targetSlotIndex = side === "beside-left" ? 1 : 0;
    const draggedSlotIndex = side === "beside-left" ? 0 : 1;

    moveExistingIntoSlot(
      actions,
      merged,
      isFirstRef,
      [targetNode.id],
      rowId,
      targetSlotIndex,
      shouldWrapBesideChild(targetNode),
      query,
      ContainerComponent
    );

    if (dragTarget.type === "existing") {
      const draggedNodes = dragTarget.nodes.map((nodeId) => query.node(nodeId).get()).filter(Boolean);
      if (draggedNodes.length === 0) return;

      const shouldWrapDragged =
        draggedNodes.length > 1 || shouldWrapBesideChild(draggedNodes[0]);

      moveExistingIntoSlot(
        actions,
        merged,
        isFirstRef,
        dragTarget.nodes,
        rowId,
        draggedSlotIndex,
        shouldWrapDragged,
        query,
        ContainerComponent
      );
    } else {
      const draggedRoot = dragTarget.tree?.nodes?.[dragTarget.tree.rootNodeId];
      addNewTreeIntoSlot(
        actions,
        merged,
        isFirstRef,
        dragTarget.tree,
        rowId,
        draggedSlotIndex,
        shouldWrapBesideChild(draggedRoot),
        query,
        ContainerComponent
      );
    }

    actions.selectNode(rowId);
  };
}
