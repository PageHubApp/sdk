/**
 * Intent → action: beside drop, main-axis reorder, then optional cross-axis alignment.
 */

import type { ComponentType } from "react";
import type { DragTarget, Indicator } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { applyAlignmentOnDrop } from "../alignmentInference";
import { onBesideDrop } from "../besideDrop";
import type { CommittedAlignmentState, DragOriginState } from "./spatialSession";
import { getDragCopyIntent } from "./spatialSession";
import { cleanupOldParentWrapper } from "./dropCleanup";
import { applyPeerClassInherit } from "../peerInherit/applyPeerClassInherit";
import { buildClonedTree } from "../../viewport/nodeOps";
import { createMergedActions, type MergedActions } from "./mergedActions";
import { applyAutomaticMorph } from "../automatic/applyAutomaticMorph";
import {
  mergeBlockModifiersIntoRootProps,
  PH_PENDING_BLOCK_MODIFIERS_KEY,
} from "../../../utils/modifierUtils";

function readPendingBlockModifiersFromInsertedTree(
  insertedTree: { nodes?: Record<string, any> } | undefined,
  newNodeId: string
): Record<string, unknown> | null {
  if (!insertedTree?.nodes?.[newNodeId]) return null;
  const raw = insertedTree.nodes[newNodeId];
  const fromData = raw?.data?.custom?.[PH_PENDING_BLOCK_MODIFIERS_KEY];
  if (fromData && typeof fromData === "object") return fromData as Record<string, unknown>;
  const fromFlat = raw?.custom?.[PH_PENDING_BLOCK_MODIFIERS_KEY];
  if (fromFlat && typeof fromFlat === "object") return fromFlat as Record<string, unknown>;
  return null;
}

/**
 * After toolbox / library insert: merge library `modifiers` into ROOT (if any), then
 * Automatic context morph + peer class inherit — one undo step with `addNodeTree`.
 */
export function applySmartDefaultsForNewNode(
  batch: MergedActions,
  query: any,
  newNodeId: string,
  parentId: string,
  opts?: { insertedTree?: { nodes?: Record<string, any> } }
) {
  let pending = readPendingBlockModifiersFromInsertedTree(opts?.insertedTree, newNodeId);
  if (!pending) {
    try {
      const g = query.node(newNodeId).get();
      const q = g?.data?.custom?.[PH_PENDING_BLOCK_MODIFIERS_KEY];
      if (q && typeof q === "object") pending = q as Record<string, unknown>;
    } catch {
      /* query may not see the node until the batch applies */
    }
  }

  if (pending && Object.keys(pending).length > 0) {
    batch.setProp(ROOT_NODE, (rootProps: Record<string, any>) => {
      mergeBlockModifiersIntoRootProps(rootProps, pending as Record<string, any>);
    });
    batch.setCustom(newNodeId, (custom: Record<string, any>) => {
      if (custom && typeof custom === "object") {
        delete custom[PH_PENDING_BLOCK_MODIFIERS_KEY];
      }
    });
  }

  applyAutomaticMorph(batch, query, newNodeId, parentId);
  applyPeerClassInherit(batch, query, newNodeId, parentId);
}

export function executeSpatialDrop(
  Container: ComponentType<any>,
  dragTarget: DragTarget,
  indicator: Indicator,
  actions: any,
  query: any,
  ctx: {
    origin: DragOriginState | null;
    committed: CommittedAlignmentState | null;
  }
): void {
  const where = indicator.placement.where;
  const isBeside = where === "beside-left" || where === "beside-right";

  if (isBeside) {
    onBesideDrop(Container)(dragTarget, indicator, actions, query);
    return;
  }

  const index = indicator.placement.index + (where === "after" ? 1 : 0);
  const parentId = indicator.placement.parent.id;
  const { origin, committed } = ctx;

  const copyExisting = dragTarget.type === "existing" && getDragCopyIntent();
  let alignmentTargetIdForExisting: string | null = null;

  if (copyExisting) {
    const setProp = actions.setProp.bind(actions);
    let insertAt = index;
    let firstCloneRoot: string | null = null;
    let lastCloneRoot: string | null = null;
    for (const nodeId of dragTarget.nodes) {
      const tree = query.node(nodeId).toNodeTree();
      const cloned = buildClonedTree({ tree, query, setProp, createLinks: false });
      actions.addNodeTree(cloned, parentId, insertAt);
      insertAt += 1;
      if (!firstCloneRoot) firstCloneRoot = cloned.rootNodeId;
      lastCloneRoot = cloned.rootNodeId;
    }
    if (lastCloneRoot) {
      actions.selectNode(lastCloneRoot);
    }
    alignmentTargetIdForExisting = firstCloneRoot;
  } else if (dragTarget.type === "existing") {
    actions.move(dragTarget.nodes, parentId, index);
    if (origin?.parentId) {
      cleanupOldParentWrapper(actions, query, origin.parentId);
    }
  } else {
    // Fresh toolbox / library drop — batch insert + smart morph into a single undo step.
    const batch = createMergedActions(actions);
    batch.addNodeTree(dragTarget.tree, indicator.placement.parent.id, index);

    const newNodeId = dragTarget.tree?.rootNodeId;
    if (newNodeId) {
      applySmartDefaultsForNewNode(batch, query, newNodeId, parentId, {
        insertedTree: dragTarget.tree,
      });
    }
  }

  if (committed && dragTarget.type === "existing") {
    const { intent, view, classDark } = committed;
    const targetId = copyExisting
      ? alignmentTargetIdForExisting
      : origin?.nodeId || dragTarget.nodes[0];
    if (targetId) {
      applyAlignmentOnDrop(actions, targetId, intent, view, classDark, query, origin?.parentId);
    }
  }
}
