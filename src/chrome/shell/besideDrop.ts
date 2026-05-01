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
  isBesideWrapper,
  makeContainerTree,
  resolveBesideTargetContext,
  getReusableRowContext,
} from "./layoutInference";
import {
  clearAlignmentIntent,
  getDragCopyIntent,
  setActiveCrossAxisAlign,
  setBesideDropInProgress,
} from "./spatial/spatialSession";
import { buildClonedTree } from "../viewport/state/nodeOps";

// ── Debug logging (dev only) ──────────────────────────────────────────

const isDev = process.env.NODE_ENV === "development";
const log = isDev
  ? (label: string, data?: Record<string, any>) => console.log(`[beside] ${label}`, data ?? "")
  : () => {};

// ── Row / wrapper class constants ─────────────────────────────────────

const ROW_CLASSNAME = "flex flex-row flex-wrap gap-space-md items-stretch min-w-0 w-full";
const PROMOTED_ROW_CLASSNAME =
  "flex flex-row flex-nowrap gap-space-md items-stretch min-w-0 w-full";
const WRAPPER_CLASSNAME = "flex min-w-0 flex-1 basis-0 h-full flex-col gap-4";
const PROMOTED_TARGET_WRAPPER_CLASSNAME = "flex min-w-0 flex-1 basis-0 h-full flex-col gap-4";
const PROMOTED_DRAGGED_WRAPPER_CLASSNAME = "flex min-w-0 shrink-0 h-full flex-col gap-4";
const SIDE_ALIGNMENT_CLASSNAME: Record<BesideSide, string> = {
  "beside-left": "items-start text-left",
  "beside-right": "items-end text-right",
};

/**
 * After moving nodes, clean up empty Row/Item/Align wrappers left behind.
 * If removing an Item leaves a Row with only 1 child, unwrap the Row too
 * (move the remaining child's children up and delete both wrappers).
 *
 * `movedNodeIds` — nodes that were moved away from their old parents.
 * Needed because batch.move() hasn't flushed yet, so query still reports
 * the old children. We exclude movedNodeIds when counting remaining children.
 */
function cleanupEmptyWrappers(
  batch: MergedActions,
  query: any,
  oldParentIds: NodeId[],
  movedNodeIds: NodeId[]
) {
  const moved = new Set(movedNodeIds);
  const seen = new Set<NodeId>();

  for (const pid of oldParentIds) {
    if (seen.has(pid)) continue;
    seen.add(pid);

    const parent = query.node(pid).get();
    if (!parent?.data) continue;
    if (!isBesideWrapper(parent)) continue;

    // Exclude moved nodes — query still reports them as children pre-flush
    const remainingChildren = (parent.data.nodes || []).filter((id: NodeId) => !moved.has(id));
    if (remainingChildren.length > 0) continue;

    const grandparentId = parent.data.parent;
    log("cleanup-empty-wrapper", { wrapperId: pid, displayName: parent.data.custom?.displayName });
    batch.delete(pid);

    // If removing this wrapper left a Row with only 1 remaining child, unwrap the Row
    if (grandparentId) {
      const grandparent = query.node(grandparentId).get();
      if (!grandparent?.data) continue;
      const gpDisplayName = grandparent.data.custom?.displayName;
      // Exclude both the deleted wrapper and moved nodes from the Row's child count
      const gpRemainingChildren = (grandparent.data.nodes || []).filter(
        (id: NodeId) => id !== pid && !moved.has(id)
      );

      if (gpDisplayName === "Row" && gpRemainingChildren.length === 1) {
        const remainingWrapperId = gpRemainingChildren[0];
        const remainingWrapper = query.node(remainingWrapperId).get();
        if (!remainingWrapper?.data) continue;

        const innerChildren = [...(remainingWrapper.data.nodes || [])];
        const rowParentId = grandparent.data.parent;
        if (!rowParentId) continue;

        const rowParent = query.node(rowParentId).get();
        const rowIndex = (rowParent?.data?.nodes || []).indexOf(grandparentId);
        if (rowIndex < 0) continue;

        log("unwrap-single-child-row", { rowId: grandparentId, remainingWrapperId, innerChildren });
        batch.move(innerChildren, rowParentId, rowIndex);
        batch.delete(remainingWrapperId);
        batch.delete(grandparentId);
      }
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

function stripCenteredLayoutTokens(className: string) {
  if (!className) return className;
  return className
    .split(/\s+/)
    .filter(Boolean)
    .filter(
      token =>
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
  const centeredNodes = nodes.filter(node => shouldPreserveCenteredContent(node)).length;
  if (centeredNodes < 2) return baseClassName;
  if (side === "beside-right") return baseClassName.replace("items-stretch", "items-end");
  if (side === "beside-left") return baseClassName;
  return baseClassName.replace("items-stretch", "items-center");
}

// Shared batch helper — see spatial/mergedActions.ts
import { createMergedActions, type MergedActions } from "./spatial/mergedActions";

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

/** Duplicate existing subtree(s) into a row slot (Shift+drag copy); mirrors moveExistingIntoSlot structure. */
function cloneExistingIntoSlot(
  batch: MergedActions,
  nodeIds: NodeId[],
  rowId: NodeId,
  slotIndex: number,
  wrapperClassName: string | null,
  query: any,
  ContainerComponent: React.ComponentType<any>,
  actions: any
) {
  const setProp = actions.setProp.bind(actions);
  if (!wrapperClassName) {
    let idx = slotIndex;
    for (const nodeId of nodeIds) {
      const tree = query.node(nodeId).toNodeTree();
      const cloned = buildClonedTree({ tree, query, setProp, createLinks: false });
      batch.addNodeTree(cloned, rowId, idx);
      idx += 1;
    }
    return;
  }
  const wrapperTree = makeContainerTree(query, ContainerComponent, wrapperClassName, "Item");
  batch.addNodeTree(wrapperTree, rowId, slotIndex);
  let innerIdx = 0;
  for (const nodeId of nodeIds) {
    const tree = query.node(nodeId).toNodeTree();
    const cloned = buildClonedTree({ tree, query, setProp, createLinks: false });
    batch.addNodeTree(cloned, wrapperTree.rootNodeId, innerIdx);
    innerIdx += 1;
  }
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

  // Capture child data before mutations to avoid stale query reads
  const firstChildId = childIds[0];
  const firstChildNode = query.node(firstChildId).get();
  const firstChildClassName = firstChildNode?.data ? getClassName(firstChildNode) : "";
  const strippedClassName = stripCenteredLayoutTokens(firstChildClassName);
  const needsClassUpdate = firstChildNode?.data && strippedClassName !== firstChildClassName;

  const wrapperTree = makeContainerTree(
    query,
    ContainerComponent,
    buildWrapperClassName(targetNode, side, "promoted-target"),
    "Item"
  );
  batch.addNodeTree(wrapperTree, rowId, slotIndex);
  batch.move(childIds, wrapperTree.rootNodeId, 0);
  batch.delete(targetNode.id);

  if (needsClassUpdate) {
    batch.setProp(firstChildId, (props: Record<string, any>) => {
      props.className = strippedClassName;
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
    setBesideDropInProgress(true);

    try {
      const copyDrag = getDragCopyIntent();
      log("drop-start", { side, dragType: dragTarget.type, parentId, targetId: targetNode.id });

      // Guard: can't drop a node beside itself or inside its own descendants
      if (dragTarget.type === "existing" && dragTarget.nodes.includes(targetNode.id)) {
        log("drop-abort", { reason: "self-drop" });
        return;
      }
      if (
        dragTarget.type === "existing" &&
        dragTarget.nodes.some((nodeId: NodeId) =>
          query.node(nodeId).descendants(true).includes(targetNode.id)
        )
      ) {
        log("drop-abort", { reason: "descendant-drop" });
        return;
      }

      // Capture old parent IDs before any moves so we can clean up empty wrappers
      const oldParentIds: NodeId[] =
        dragTarget.type === "existing"
          ? dragTarget.nodes
              .map((nodeId: NodeId) => query.node(nodeId).get()?.data?.parent)
              .filter(Boolean)
          : [];

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
        const anchorIndex = (reusableRow.rowNode.data.nodes || []).indexOf(
          reusableRow.anchorNode.id
        );
        if (anchorIndex < 0) return;

        const insertIndex = side === "beside-left" ? anchorIndex : anchorIndex + 1;
        const batch = createMergedActions(actions);
        const wrapperCls = shouldWrapBesideChild(draggedPreviewNode)
          ? buildWrapperClassName(
              draggedPreviewNode,
              side,
              usedPromotedTarget ? "promoted-dragged" : "default"
            )
          : null;

        log("reuse-row", { rowId, anchorId: reusableRow.anchorNode.id, insertIndex, wrapperCls });

        if (dragTarget.type === "existing") {
          if (copyDrag) {
            cloneExistingIntoSlot(
              batch,
              dragTarget.nodes,
              rowId,
              insertIndex,
              wrapperCls,
              query,
              ContainerComponent,
              actions
            );
          } else {
            moveExistingIntoSlot(
              batch,
              dragTarget.nodes,
              rowId,
              insertIndex,
              wrapperCls,
              query,
              ContainerComponent
            );
            cleanupEmptyWrappers(batch, query, oldParentIds, dragTarget.nodes);
          }
        } else {
          addNewTreeIntoSlot(
            batch,
            dragTarget.tree,
            rowId,
            insertIndex,
            wrapperCls,
            query,
            ContainerComponent
          );
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
          batch,
          effectiveTargetNode,
          rowId,
          targetSlotIndex,
          side,
          query,
          ContainerComponent
        );
      } else {
        const targetWrapCls = shouldWrapBesideChild(effectiveTargetNode)
          ? buildWrapperClassName(effectiveTargetNode, side, "default")
          : null;
        log("target-slot", {
          targetId: effectiveTargetNode.id,
          slotIndex: targetSlotIndex,
          wrapperCls: targetWrapCls,
        });
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
        const draggedNodes = dragTarget.nodes
          .map((nodeId: NodeId) => query.node(nodeId).get())
          .filter(Boolean);
        if (draggedNodes.length === 0) return;

        const draggedWrapCls =
          draggedNodes.length > 1 || shouldWrapBesideChild(draggedNodes[0])
            ? buildWrapperClassName(
                draggedNodes[0],
                side,
                usedPromotedTarget ? "promoted-dragged" : "default"
              )
            : null;
        log("dragged-existing", {
          nodeIds: dragTarget.nodes,
          slotIndex: draggedSlotIndex,
          wrapperCls: draggedWrapCls,
        });
        if (copyDrag) {
          cloneExistingIntoSlot(
            batch,
            dragTarget.nodes,
            rowId,
            draggedSlotIndex,
            draggedWrapCls,
            query,
            ContainerComponent,
            actions
          );
        } else {
          moveExistingIntoSlot(
            batch,
            dragTarget.nodes,
            rowId,
            draggedSlotIndex,
            draggedWrapCls,
            query,
            ContainerComponent
          );
        }
      } else {
        const draggedRoot = dragTarget.tree?.nodes?.[dragTarget.tree.rootNodeId];
        const draggedWrapCls = shouldWrapBesideChild(draggedRoot)
          ? buildWrapperClassName(
              draggedRoot,
              side,
              usedPromotedTarget ? "promoted-dragged" : "default"
            )
          : null;
        log("dragged-new", {
          rootId: draggedRoot?.id ?? null,
          slotIndex: draggedSlotIndex,
          wrapperCls: draggedWrapCls,
        });
        addNewTreeIntoSlot(
          batch,
          dragTarget.tree,
          rowId,
          draggedSlotIndex,
          draggedWrapCls,
          query,
          ContainerComponent
        );
      }

      // Clean up empty Row/Item wrappers left behind after moving existing nodes (not when copying)
      if (dragTarget.type === "existing" && !copyDrag) {
        cleanupEmptyWrappers(batch, query, oldParentIds, dragTarget.nodes);
      }

      log("done", { rowId });
      actions.selectNode(rowId);
    } catch (err) {
      log("drop-error", { error: String(err) });
      try {
        actions.history.undo();
      } catch (_) {
        /* undo may fail if nothing was committed */
      }
    }
  };
}
