// @ts-nocheck
import { NodeId } from "@craftjs/core";

/**
 * Calculate drop position based on mouse Y position within element
 * @param mouseY - Mouse Y coordinate relative to element
 * @param elementHeight - Height of the element
 * @param hasChildren - Whether the node has children
 * @param isCanvas - Whether the node is a canvas (can contain children)
 * @returns Drop position: "before" | "after" | "inside"
 */
export function calculateDropPosition(
  mouseY: number,
  elementHeight: number,
  hasChildren: boolean,
  isCanvas: boolean
): "before" | "after" | "inside" {
  const relativeY = mouseY / elementHeight;

  // If node is a canvas and mouse is in middle third, drop inside
  if (isCanvas && relativeY > 0.33 && relativeY < 0.66) {
    return "inside";
  }

  // If node has children and mouse is in middle third, drop inside
  if (hasChildren && relativeY > 0.33 && relativeY < 0.66) {
    return "inside";
  }

  // Otherwise drop before or after
  return relativeY < 0.5 ? "before" : "after";
}

/**
 * Check if a node is a descendant of another node
 * @param nodeId - Node to check
 * @param ancestorId - Potential ancestor
 * @param nodes - All nodes in the editor
 * @returns true if nodeId is a descendant of ancestorId
 */
export function isDescendantOf(
  nodeId: NodeId,
  ancestorId: NodeId,
  nodes: Record<NodeId, any>
): boolean {
  let currentId: NodeId | null = nodeId;

  while (currentId) {
    if (currentId === ancestorId) {
      return true;
    }
    currentId = nodes[currentId]?.data?.parent;
  }

  return false;
}

/**
 * Get all ancestor node IDs for a given node
 * @param nodeId - Node to get ancestors for
 * @param nodes - All nodes in the editor
 * @returns Array of ancestor node IDs (from immediate parent to root)
 */
export function getAncestors(nodeId: NodeId, nodes: Record<NodeId, any>): NodeId[] {
  const ancestors: NodeId[] = [];
  let currentId = nodes[nodeId]?.data?.parent;

  while (currentId) {
    ancestors.push(currentId);
    currentId = nodes[currentId]?.data?.parent;
  }

  return ancestors;
}

/**
 * Get display name for a node with fallbacks
 * @param node - The node to get display name for
 * @returns Display name
 */
export function getDisplayName(node: any): string {
  return (
    node?.data?.custom?.displayName || node?.data?.displayName || node?.data?.name || "Unnamed"
  );
}

/**
 * Validate if a move operation is allowed
 * @param draggedNodeId - Node being dragged
 * @param targetNodeId - Target node
 * @param position - Drop position
 * @param nodes - All nodes
 * @returns true if move is allowed
 */
export function canMove(
  draggedNodeId: NodeId,
  targetNodeId: NodeId,
  position: "before" | "after" | "inside",
  nodes: Record<NodeId, any>
): boolean {
  // Can't move to self
  if (draggedNodeId === targetNodeId) {
    return false;
  }

  // Can't move to a descendant
  if (isDescendantOf(targetNodeId, draggedNodeId, nodes)) {
    return false;
  }

  // If dropping inside, target must be a canvas
  if (position === "inside") {
    const targetNode = nodes[targetNodeId];
    if (!targetNode?.data?.isCanvas) {
      return false;
    }
  }

  return true;
}

/**
 * Count total descendants of a node
 * @param nodeId - Node to count descendants for
 * @param nodes - All nodes
 * @returns Number of descendants
 */
export function countDescendants(nodeId: NodeId, nodes: Record<NodeId, any>): number {
  const node = nodes[nodeId];
  if (!node) return 0;

  let count = 0;
  const children = node.data?.nodes || [];

  for (const childId of children) {
    count += 1 + countDescendants(childId, nodes);
  }

  return count;
}

/**
 * Search nodes by display name
 * @param searchTerm - Search term
 * @param nodes - All nodes
 * @returns Set of matching node IDs (includes ancestors for tree display)
 */
export function searchNodes(searchTerm: string, nodes: Record<NodeId, any>): Set<NodeId> {
  const matches = new Set<NodeId>();
  const searchLower = searchTerm.toLowerCase();

  Object.entries(nodes).forEach(([nodeId, node]) => {
    const name = getDisplayName(node).toLowerCase();
    if (name.includes(searchLower)) {
      matches.add(nodeId);

      // Add all ancestors so they show in tree
      const ancestors = getAncestors(nodeId, nodes);
      ancestors.forEach(ancestorId => matches.add(ancestorId));
    }
  });

  return matches;
}
