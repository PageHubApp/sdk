/**
 * Beside drop handler: tree restructuring on beside-left / beside-right drops.
 *
 * Called by CraftJS when placement.where is "beside-left" or "beside-right".
 * Wraps the target sibling + dropped node in a new flex-row Container.
 */

import React from "react";
import type { DragTarget, Indicator, Node, NodeId } from "@craftjs/core";
import {
  type BesideSide,
  SKIP_TYPES,
  getClassName,
  isContainerLike,
  hasFullWidthClass,
  shouldPreserveCenteredContent,
  isSimpleBesideRow,
  makeContainerTree,
  resolveBesideTargetContext,
  getReusableRowContext,
} from "./layoutInference";
import { clearAlignmentIntent } from "./alignmentInference";

// ── Debug logging (dev only) ──────────────────────────────────────────

const isDev = process.env.NODE_ENV === "development";
const log = isDev
  ? (label: string, data?: Record<string, any>) => console.log(`[beside] ${label}`, data ?? "")
  : () => {};

// ── Row / wrapper class constants ─────────────────────────────────────

const ROW_CLASSNAME = "flex flex-row flex-wrap gap-space-md items-stretch min-w-0 w-full";
const PROMOTED_ROW_CLASSNAME = "flex flex-row flex-nowrap gap-space-md items-stretch min-w-0 w-full";
const WRAPPER_CLASSNAME = "flex min-w-0 flex-1 basis-0 h-full flex-col gap-4";
const PROMOTED_TARGET_WRAPPER_CLASSNAME = "flex min-w-0 flex-1 basis-0 h-full flex-col gap-4";
const PROMOTED_DRAGGED_WRAPPER_CLASSNAME = "flex min-w-0 shrink-0 h-full flex-col gap-4";
const SIDE_ALIGNMENT_CLASSNAME: Record<BesideSide, string> = {
  "beside-left": "items-start text-left",
  "beside-right": "items-end text-right",
};

// ── Helpers ───────────────────────────────────────────────────────────

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

function shouldWrapBesideChild(_node: Pick<Node, "data"> | undefined | null) {
  // Always wrap — the Item wrapper provides flex-1 basis-0 h-full for
  // equal width distribution and full-height alignment in the row.
  return true;
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
  if (side === "beside-right") return baseClassName.replace("items-stretch", "items-end");
  if (side === "beside-left") return baseClassName;
  return baseClassName.replace("items-stretch", "items-center");
}

// ── Batched action dispatch ───────────────────────────────────────────
// CraftJS history.merge() requires the first mutation through `actions`
// and subsequent ones through the merged handle. This wrapper hides that.

interface MergedActions {
  addNodeTree(tree: any, parentId: NodeId, index: number): void;
  move(selector: NodeId | NodeId[], parentId: NodeId, index: number): void;
  delete(nodeId: NodeId): void;
  setProp(nodeId: NodeId, cb: (props: Record<string, any>) => void): void;
}

function createMergedActions(actions: any): MergedActions {
  const merged = actions.history.merge();
  let first = true;
  const target = () => {
    if (first) { first = false; return actions; }
    return merged;
  };
  return {
    addNodeTree: (tree, parentId, index) => target().addNodeTree(tree, parentId, index),
    move: (selector, parentId, index) => target().move(selector, parentId, index),
    delete: (nodeId) => target().delete(nodeId),
    setProp: (nodeId, cb) => target().setProp(nodeId, cb),
  };
}

// ── Slot helpers ──────────────────────────────────────────────────────

function addNewTreeIntoSlot(
  batch: MergedActions,
  tree: any,
  rowId: NodeId,
  slotIndex: number,
  wrapperClassName: string | null,
  query: any,
  ContainerComponent: React.ComponentType<any>
) {
  if (!wrapperClassName) {
    batch.addNodeTree(tree, rowId, slotIndex);
    return;
  }
  const wrapperTree = makeContainerTree(query, ContainerComponent, wrapperClassName, "Item");
  batch.addNodeTree(wrapperTree, rowId, slotIndex);
  batch.addNodeTree(tree, wrapperTree.rootNodeId, 0);
}

function moveExistingIntoSlot(
  batch: MergedActions,
  nodeIds: NodeId[],
  rowId: NodeId,
  slotIndex: number,
  wrapperClassName: string | null,
  query: any,
  ContainerComponent: React.ComponentType<any>
) {
  if (!wrapperClassName) {
    batch.move(nodeIds, rowId, slotIndex);
    return;
  }
  const wrapperTree = makeContainerTree(query, ContainerComponent, wrapperClassName, "Item");
  batch.addNodeTree(wrapperTree, rowId, slotIndex);
  batch.move(nodeIds, wrapperTree.rootNodeId, 0);
}

function movePromotedTargetIntoFreshSlot(
  batch: MergedActions,
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
      batch,
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
  batch.addNodeTree(wrapperTree, rowId, slotIndex);
  batch.move(childIds, wrapperTree.rootNodeId, 0);
  batch.delete(targetNode.id);

  const firstChildId = childIds[0];
  const firstChildNode = query.node(firstChildId).get();
  if (!firstChildNode?.data) return;

  const firstChildClassName = getClassName(firstChildNode);
  const nextChildClassName = stripCenteredLayoutTokens(firstChildClassName);
  if (nextChildClassName !== firstChildClassName) {
    batch.setProp(firstChildId, (props: Record<string, any>) => {
      props.className = nextChildClassName;
    });
  }
}

// ── Main drop handler ─────────────────────────────────────────────────

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

    // Beside drop wins over alignment — clear any stale alignment intent
    // so the dragend handler in CustomEventHandlers doesn't double-apply.
    clearAlignmentIntent();

    log("drop-start", { side, dragType: dragTarget.type, parentId, targetId: targetNode.id });

    // Guard: can't drop a node beside itself or inside its own descendants
    if (dragTarget.type === "existing" && dragTarget.nodes.includes(targetNode.id)) {
      log("drop-abort", { reason: "self-drop" });
      return;
    }
    if (
      dragTarget.type === "existing" &&
      dragTarget.nodes.some((nodeId: NodeId) => query.node(nodeId).descendants(true).includes(targetNode.id))
    ) {
      log("drop-abort", { reason: "descendant-drop" });
      return;
    }

    const initialParentNode = query.node(parentId).get();
    const resolvedContext = resolveBesideTargetContext(query, initialParentNode, targetNode);
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
        ? dragTarget.nodes.map((nodeId: NodeId) => query.node(nodeId).get()).filter(Boolean)[0]
        : dragTarget.tree?.nodes?.[dragTarget.tree.rootNodeId];

    log("resolved", {
      effectiveTargetId: effectiveTargetNode.id,
      effectiveParentId,
      usedPromotedTarget,
      rejectedPromotion: shouldRejectPromotion,
      reusableRowId: reusableRow?.rowNode?.id ?? null,
      targetClassName: getClassName(effectiveTargetNode),
      parentClassName: getClassName(parentNode),
    });

    // ── Reuse existing row ──────────────────────────────────────────

    if (reusableRow) {
      const rowId = reusableRow.rowNode.id;
      const anchorIndex = (reusableRow.rowNode.data.nodes || []).indexOf(reusableRow.anchorNode.id);
      if (anchorIndex < 0) return;

      const insertIndex = side === "beside-left" ? anchorIndex : anchorIndex + 1;
      const batch = createMergedActions(actions);
      const wrapperCls = shouldWrapBesideChild(draggedPreviewNode)
        ? buildWrapperClassName(draggedPreviewNode, side, usedPromotedTarget ? "promoted-dragged" : "default")
        : null;

      log("reuse-row", { rowId, anchorId: reusableRow.anchorNode.id, insertIndex, wrapperCls });

      if (dragTarget.type === "existing") {
        moveExistingIntoSlot(batch, dragTarget.nodes, rowId, insertIndex, wrapperCls, query, ContainerComponent);
      } else {
        addNewTreeIntoSlot(batch, dragTarget.tree, rowId, insertIndex, wrapperCls, query, ContainerComponent);
      }

      actions.selectNode(rowId);
      log("reuse-row-done", { rowId });
      return;
    }

    // ── Create new row ──────────────────────────────────────────────

    const targetIndex = (parentNode.data.nodes || []).indexOf(effectiveTargetNode.id);
    if (targetIndex < 0) return;

    const rowClassName = buildRowClassName(
      side,
      [parentNode, effectiveTargetNode, draggedPreviewNode],
      usedPromotedTarget ? "promoted" : "default"
    );
    const rowTree = makeContainerTree(query, ContainerComponent, rowClassName, "Row");
    const rowId = rowTree.rootNodeId;
    const batch = createMergedActions(actions);

    log("create-row", { rowId, effectiveParentId, targetIndex, rowClassName });

    batch.addNodeTree(rowTree, effectiveParentId, targetIndex);

    const targetSlotIndex = side === "beside-left" ? 1 : 0;
    const draggedSlotIndex = side === "beside-left" ? 0 : 1;

    // Place the target content into its slot
    if (usedPromotedTarget) {
      log("promoted-target", {
        targetId: effectiveTargetNode.id,
        childCount: effectiveTargetNode.data.nodes?.length ?? 0,
        slotIndex: targetSlotIndex,
      });
      movePromotedTargetIntoFreshSlot(
        batch, effectiveTargetNode, rowId, targetSlotIndex, side, query, ContainerComponent
      );
    } else {
      const targetWrapCls = shouldWrapBesideChild(effectiveTargetNode)
        ? buildWrapperClassName(effectiveTargetNode, side, "default")
        : null;
      log("target-slot", { targetId: effectiveTargetNode.id, slotIndex: targetSlotIndex, wrapperCls: targetWrapCls });
      moveExistingIntoSlot(
        batch,
        [effectiveTargetNode.id],
        rowId,
        targetSlotIndex,
        targetWrapCls,
        query,
        ContainerComponent
      );
    }

    // Place the dragged content into its slot
    if (dragTarget.type === "existing") {
      const draggedNodes = dragTarget.nodes.map((nodeId: NodeId) => query.node(nodeId).get()).filter(Boolean);
      if (draggedNodes.length === 0) return;

      const draggedWrapCls = draggedNodes.length > 1 || shouldWrapBesideChild(draggedNodes[0])
        ? buildWrapperClassName(draggedNodes[0], side, usedPromotedTarget ? "promoted-dragged" : "default")
        : null;
      log("dragged-existing", { nodeIds: dragTarget.nodes, slotIndex: draggedSlotIndex, wrapperCls: draggedWrapCls });
      moveExistingIntoSlot(batch, dragTarget.nodes, rowId, draggedSlotIndex, draggedWrapCls, query, ContainerComponent);
    } else {
      const draggedRoot = dragTarget.tree?.nodes?.[dragTarget.tree.rootNodeId];
      const draggedWrapCls = shouldWrapBesideChild(draggedRoot)
        ? buildWrapperClassName(draggedRoot, side, usedPromotedTarget ? "promoted-dragged" : "default")
        : null;
      log("dragged-new", { rootId: draggedRoot?.id ?? null, slotIndex: draggedSlotIndex, wrapperCls: draggedWrapCls });
      addNewTreeIntoSlot(batch, dragTarget.tree, rowId, draggedSlotIndex, draggedWrapCls, query, ContainerComponent);
    }

    log("done", { rowId });
    actions.selectNode(rowId);
  };
}
