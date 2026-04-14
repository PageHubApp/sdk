/**
 * Utility functions for managing linked components
 */

/**
 * Recursively set belongsTo relationship on all nodes in a cloned tree
 * Maps each cloned node to its corresponding master node
 */
export const setRecursiveBelongsTo = (
  clonedNodeId: string,
  masterNodeId: string,
  query: any,
  actions: any,
  additionalProps?: (clonedNodeId: string, prop: any) => void
) => {
  const clonedNode = query.node(clonedNodeId).get();
  const masterNode = query.node(masterNodeId).get();

  if (!clonedNode || !masterNode) return;

  // Set belongsTo on this node
  actions.setProp(clonedNodeId, (prop: any) => {
    prop.belongsTo = masterNodeId;
    prop.relationType = "full";

    // Allow caller to set additional props (e.g., savedComponentName on root)
    if (additionalProps) {
      additionalProps(clonedNodeId, prop);
    }
  });

  // Recursively set on children
  const clonedChildren = clonedNode.data.nodes || [];
  const masterChildren = masterNode.data.nodes || [];

  clonedChildren.forEach((clonedChildId: string, index: number) => {
    const masterChildId = masterChildren[index];
    if (masterChildId) {
      setRecursiveBelongsTo(clonedChildId, masterChildId, query, actions, additionalProps);
    }
  });
};

/**
 * Check if a node or any of its ancestors is a fully linked component
 * Returns true if the node belongs to a master component
 */
export const checkIfAncestorLinked = (nodeId: string, query: any): boolean => {
  const node = query.node(nodeId).get();
  if (!node) return false;

  // If this node is fully linked, return true
  if (node.data.props?.belongsTo && node.data.props?.relationType !== "style") {
    return true;
  }

  // Check parent
  if (node.data.parent) {
    return checkIfAncestorLinked(node.data.parent, query);
  }

  return false;
};

/**
 * Get the linked master node if this node or any ancestor is linked
 * Returns the node that contains belongsTo info, or null
 */
export const getLinkedAncestorNode = (nodeId: string, query: any): any => {
  const node = query.node(nodeId).get();
  if (!node) return null;

  // If this node is fully linked, return it
  if (node.data.props?.belongsTo && node.data.props?.relationType !== "style") {
    return node;
  }

  // Check parent
  if (node.data.parent) {
    return getLinkedAncestorNode(node.data.parent, query);
  }

  return null;
};
