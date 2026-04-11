import type { NodeId } from "@craftjs/core";

export interface SiblingMoveState {
  canMoveUp: boolean;
  canMoveDown: boolean;
  canMoveOut: boolean;
  canMoveIn: boolean;
}

export function getSiblingMoveState(query: any, nodeId: NodeId): SiblingMoveState {
  const node = query.node(nodeId).get();
  const parentId = node?.data?.parent;
  const parent = parentId ? query.node(parentId).get() : null;
  const siblings = parent?.data?.nodes || [];
  const currentIndex = siblings.indexOf(nodeId);
  const grandparentId = parent?.data?.parent;

  const canMoveUp = currentIndex > 0;
  const canMoveDown = currentIndex < siblings.length - 1;

  let canMoveOut = false;
  if (grandparentId) {
    try {
      const grandparent = query.node(grandparentId).get();
      canMoveOut = (grandparent?.rules?.canMoveIn as any)?.([node], grandparent) ?? false;
    } catch {
      canMoveOut = false;
    }
  }

  let canMoveIn = false;
  if (currentIndex > 0 && siblings[currentIndex - 1]) {
    try {
      const prevSiblingId = siblings[currentIndex - 1];
      const prevSibling = query.node(prevSiblingId).get();
      canMoveIn =
        prevSibling?.data?.isCanvas &&
        query.node(nodeId).isDraggable() &&
        ((prevSibling?.rules?.canMoveIn as any)?.([node], prevSibling) ?? false);
    } catch {
      canMoveIn = false;
    }
  }

  return { canMoveUp, canMoveDown, canMoveOut, canMoveIn };
}

export function moveNodeUp(query: any, actions: any, nodeId: NodeId): void {
  const node = query.node(nodeId).get();
  const parentId = node.data.parent;
  if (!parentId) return;
  const parent = query.node(parentId).get();
  const siblings = parent.data.nodes || [];
  const currentIndex = siblings.indexOf(nodeId);
  if (currentIndex > 0) {
    actions.move(nodeId, parentId, currentIndex - 1);
  }
}

export function moveNodeDown(query: any, actions: any, nodeId: NodeId): void {
  const node = query.node(nodeId).get();
  const parentId = node.data.parent;
  if (!parentId) return;
  const parent = query.node(parentId).get();
  const siblings = parent.data.nodes || [];
  const currentIndex = siblings.indexOf(nodeId);
  if (currentIndex < siblings.length - 1) {
    actions.move(nodeId, parentId, currentIndex + 2);
  }
}

export function moveNodeOut(query: any, actions: any, nodeId: NodeId): void {
  const node = query.node(nodeId).get();
  const parentId = node.data.parent;
  if (!parentId) return;
  const parent = query.node(parentId).get();
  const grandparentId = parent.data.parent;
  if (!grandparentId) return;
  const grandparent = query.node(grandparentId).get();
  if (!(grandparent.rules.canMoveIn as any)([node], grandparent)) {
    console.warn("Cannot move node out - grandparent rejects this node type");
    return;
  }
  try {
    const parentSiblings = grandparent.data.nodes || [];
    const parentIndex = parentSiblings.indexOf(parentId);
    actions.move(nodeId, grandparentId, parentIndex + 1);
  } catch (error) {
    console.error("Cannot move node out:", error);
  }
}

export function moveNodeIn(query: any, actions: any, nodeId: NodeId): void {
  const node = query.node(nodeId).get();
  const parentId = node.data.parent;
  if (!parentId) return;
  const parent = query.node(parentId).get();
  const siblings = parent.data.nodes || [];
  const currentIndex = siblings.indexOf(nodeId);
  if (currentIndex > 0) {
    const prevSiblingId = siblings[currentIndex - 1];
    const prevSibling = query.node(prevSiblingId).get();
    if (prevSibling.data.isCanvas) {
      try {
        if (!(prevSibling.rules.canMoveIn as any)([node], prevSibling)) {
          console.warn("Cannot move node in - previous sibling rejects this node type");
          return;
        }
        const prevSiblingChildren = prevSibling.data.nodes || [];
        actions.move(nodeId, prevSiblingId, prevSiblingChildren.length);
      } catch (error) {
        console.warn("Cannot move node into previous sibling:", error);
      }
    }
  }
}
