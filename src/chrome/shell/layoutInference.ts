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
import { twMerge } from "tailwind-merge";
import type { Node, NodeInfo, DragTarget, Indicator } from "@craftjs/core";

const BESIDE_ZONE = 0.25;
const SKIP_TYPES = new Set(["page", "header", "footer"]);

/**
 * Called by CraftJS findPosition for each in-flow child during drag.
 */
export function besideDetector(
  parent: Node,
  childDim: NodeInfo,
  posX: number,
  _posY: number
): "beside-left" | "beside-right" | null {
  const parentDom = parent.dom;
  if (!parentDom) return null;

  const parentType = parent.data?.props?.type;
  if (SKIP_TYPES.has(parentType)) return null;

  const style = window.getComputedStyle(parentDom);
  const dir = style.flexDirection;
  if (dir !== "column" && dir !== "column-reverse") return null;

  const relX = posX - childDim.left;
  const w = childDim.outerWidth;
  if (w <= 0) return null;

  // Must be inside the child bounds
  if (relX < 0 || relX > w) return null;

  if (relX < w * BESIDE_ZONE) return "beside-left";
  if (relX > w * (1 - BESIDE_ZONE)) return "beside-right";

  return null;
}

/**
 * Called by CraftJS on drop when placement.where is "beside-left" or "beside-right".
 * Wraps the target sibling and the dragged node(s) in a new Row container.
 *
 * actions and query are passed from CraftJS's DefaultEventHandlers (store.actions, store.query).
 */
export function onBesideDrop(
  ContainerComponent: React.ComponentType<any>
) {
  return (dragTarget: DragTarget, indicator: Indicator, actions: any, query: any) => {
    const { parent, where, currentNode } = indicator.placement;
    if (!currentNode) return;

    const parentId = parent.id;
    const targetId = currentNode.id;
    const side = where as "beside-left" | "beside-right";

    const parentNode = query.node(parentId).get();
    const siblings = parentNode.data.nodes;
    const targetIndex = siblings.indexOf(targetId);
    if (targetIndex === -1) return;

    // Direct state manipulation — bypasses CraftJS validation which fights
    // itself during the intermediate states of create + move + move.
    // Use the parent's type for the row — parent is a Container (it's flex-col)
    const containerType = parentNode.data.type;
    const rowNodeId = `row_${Date.now().toString(36)}`;

    actions.setState((state: any) => {
      // 1. Create the row node directly in state
      state.nodes[rowNodeId] = {
        id: rowNodeId,
        _hydrationTimestamp: Date.now(),
        data: {
          type: containerType,
          name: "Container",
          displayName: "Container",
          props: {
            className: "flex flex-row flex-wrap gap-space-md items-start min-w-0 w-full",
          },
          custom: { displayName: "Row" },
          parent: parentId,
          isCanvas: true,
          hidden: false,
          nodes: [],
          linkedNodes: {},
        },
        events: { selected: false, dragged: false, hovered: false },
        rules: {
          canDrag: () => true,
          canDrop: () => true,
          canMoveIn: () => true,
          canMoveOut: () => true,
        },
        dom: null,
        related: {},
        info: {},
      };

      // 2. Insert row into parent at target's position
      const parentNodes = state.nodes[parentId].data.nodes;
      parentNodes.splice(targetIndex, 0, rowNodeId);

      // 3. Move target from parent into row
      const targetIdx = parentNodes.indexOf(targetId);
      parentNodes.splice(targetIdx, 1);
      state.nodes[rowNodeId].data.nodes.push(targetId);
      state.nodes[targetId].data.parent = rowNodeId;

      // 4. Move/add dragged node into row
      if (dragTarget.type === "existing") {
        const insertIdx = side === "beside-left" ? 0 : 1;
        for (const nodeId of dragTarget.nodes) {
          // Remove from current parent
          const draggedNode = state.nodes[nodeId];
          const oldParentNodes = state.nodes[draggedNode.data.parent].data.nodes;
          const oldIdx = oldParentNodes.indexOf(nodeId);
          if (oldIdx !== -1) oldParentNodes.splice(oldIdx, 1);
          // Add to row
          state.nodes[rowNodeId].data.nodes.splice(insertIdx, 0, nodeId);
          draggedNode.data.parent = rowNodeId;
        }
      }

      // 5. Strip w-full from children so they don't each take 100% of the row
      for (const childId of state.nodes[rowNodeId].data.nodes) {
        const child = state.nodes[childId];
        if (child?.data?.props?.className) {
          child.data.props.className = child.data.props.className
            .replace(/\bw-full\b/g, "")
            .replace(/\s+/g, " ")
            .trim();
        }
      }

      // 6. Select the row
      state.events.selected.forEach((id: string) => {
        if (state.nodes[id]) state.nodes[id].events.selected = false;
      });
      state.events.selected = new Set([rowNodeId]);
      state.nodes[rowNodeId].events.selected = true;
    });
  };
}
