/**
 * Client-side tree decomposition for per-page saves.
 * Minimal version of lib/sharding.js — pure functions, no DB.
 */

/** Collect a node and all its descendants into `out`. */
function collectSubtree(flat: Record<string, any>, nodeId: string, out: Record<string, any>): void {
  if (!flat[nodeId] || out[nodeId]) return;
  out[nodeId] = flat[nodeId];
  for (const childId of flat[nodeId].nodes || []) {
    collectSubtree(flat, childId, out);
  }
  for (const linkedId of Object.values(flat[nodeId].linkedNodes || {})) {
    collectSubtree(flat, linkedId as string, out);
  }
}

/**
 * Find which page a node belongs to by walking up the parent chain.
 * Returns the page node ID, or null if the node is shared (ROOT, header, footer).
 */
export function findOwningPage(flat: Record<string, any>, nodeId: string): string | null {
  let cur = nodeId;
  let depth = 0;
  while (cur && depth++ < 100) {
    const node = flat[cur];
    if (!node) return null;
    if (node.props?.type === "page" && node.parent === "ROOT") return cur;
    cur = node.parent;
  }
  return null;
}

/**
 * Extract a single page's subtree from the full flat map.
 */
export function extractPageShard(flat: Record<string, any>, pageNodeId: string): Record<string, any> {
  const shard: Record<string, any> = {};
  collectSubtree(flat, pageNodeId, shard);
  return shard;
}

/**
 * Extract the shared shard (ROOT + non-page children + their subtrees).
 */
export function extractSharedShard(flat: Record<string, any>): Record<string, any> {
  if (!flat.ROOT) return {};
  const shared: Record<string, any> = {};
  const rootChildren = flat.ROOT.nodes || [];
  const sharedChildIds = rootChildren.filter(
    (id: string) => flat[id]?.props?.type !== "page"
  );

  shared.ROOT = {
    ...flat.ROOT,
    nodes: sharedChildIds,
    _originalNodeOrder: rootChildren,
  };
  for (const childId of sharedChildIds) {
    collectSubtree(flat, childId, shared);
  }
  return shared;
}

/**
 * Assemble a full flat map from shared shard + page shards.
 * Restores the original ROOT.nodes order (header, pages, footer).
 */
export function assembleFromShards(
  shared: Record<string, any>,
  pages: Record<string, Record<string, any>>,
): Record<string, any> {
  const flat: Record<string, any> = { ...shared };

  // Merge page subtrees
  for (const subtree of Object.values(pages)) {
    Object.assign(flat, subtree);
  }

  // Rebuild ROOT.nodes preserving original order
  const originalOrder: string[] | undefined = shared.ROOT?._originalNodeOrder;
  const orderedPageIds = Object.keys(pages);
  const pageIdSet = new Set(orderedPageIds);

  let rebuiltNodes: string[];
  if (originalOrder?.length) {
    rebuiltNodes = [];
    for (const nodeId of originalOrder) {
      if (pageIdSet.has(nodeId)) {
        rebuiltNodes.push(nodeId);
        pageIdSet.delete(nodeId);
      } else if (flat[nodeId]) {
        rebuiltNodes.push(nodeId);
      }
    }
    // Append new pages not in original order
    for (const id of orderedPageIds) {
      if (pageIdSet.has(id)) rebuiltNodes.push(id);
    }
  } else {
    const sharedChildIds = shared.ROOT?.nodes || [];
    rebuiltNodes = [...sharedChildIds, ...orderedPageIds];
  }

  flat.ROOT = { ...flat.ROOT, nodes: rebuiltNodes };
  delete flat.ROOT._originalNodeOrder;

  return flat;
}
