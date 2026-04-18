/**
 * Intent → action: beside drop, main-axis reorder, then optional cross-axis alignment.
 */

import type { ComponentType } from "react";
import type { DragTarget, Indicator } from "@craftjs/core";
import { applyAlignmentOnDrop } from "../alignmentInference";
import { onBesideDrop } from "../besideDrop";
import type { CommittedAlignmentState, DragOriginState } from "./spatialSession";
import { getDragCopyIntent } from "./spatialSession";
import { cleanupOldParentWrapper } from "./dropCleanup";
import { applyPeerClassInherit } from "../peerInherit/applyPeerClassInherit";
import { buildClonedTree } from "../../viewport/nodeOps";
import { createMergedActions, type MergedActions } from "./mergedActions";
import { applyAutomaticMorph } from "../automatic/applyAutomaticMorph";

/**
 * After toolbox / library insert: run Automatic context morph + peer class inherit as part
 * of the provided merged-action batch so the whole drop (addNodeTree + morph) is one undo step.
 */
export function applySmartDefaultsForNewNode(batch: MergedActions, query: any, newNodeId: string, parentId: string) {
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
      applySmartDefaultsForNewNode(batch, query, newNodeId, parentId);
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
