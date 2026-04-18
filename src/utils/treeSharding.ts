/**
 * Client-side tree decomposition for per-page saves.
 * Minimal subset of lib/sharding.js — pure functions, no DB.
 *
 * Only extractPageShard + extractSharedShard are used (by editor.tsx save handler).
 * The server-side lib/sharding.js owns the full decompose/assemble logic.
 */

/** Collect a node and all its descendants (nodes + linkedNodes) into `out`. */
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
 * Extract a single page's subtree from the full flat map.
 */
export function extractPageShard(
  flat: Record<string, any>,
  pageNodeId: string
): Record<string, any> {
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
  const sharedChildIds = rootChildren.filter((id: string) => flat[id]?.props?.type !== "page");

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
