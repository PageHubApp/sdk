/**
 * Batched action dispatch for CraftJS.
 *
 * CraftJS `actions.history.merge()` requires the first mutation to go through
 * `actions` and subsequent mutations through the returned merged handle. This
 * wrapper hides that rule so callers can just use `batch.xxx(...)` and get a
 * single undo step.
 */

import type { NodeId } from "@craftjs/core";

export interface MergedActions {
  addNodeTree(tree: any, parentId: NodeId, index?: number): void;
  move(selector: NodeId | NodeId[], parentId: NodeId, index: number): void;
  delete(nodeId: NodeId): void;
  setProp(nodeId: NodeId, cb: (props: Record<string, any>) => void): void;
  setCustom(nodeId: NodeId, cb: (custom: Record<string, any>) => void): void;
}

export function createMergedActions(actions: any): MergedActions {
  const merged = actions.history.merge();
  let first = true;
  const target = () => {
    if (first) {
      first = false;
      return actions;
    }
    return merged;
  };
  return {
    addNodeTree: (tree, parentId, index) => target().addNodeTree(tree, parentId, index),
    move: (selector, parentId, index) => target().move(selector, parentId, index),
    delete: nodeId => target().delete(nodeId),
    setProp: (nodeId, cb) => target().setProp(nodeId, cb),
    setCustom: (nodeId, cb) => target().setCustom(nodeId, cb),
  };
}
