/**
 * Editor-side anchor resolver.
 *
 * Wrapper components (AgentFloatingBubble, AgentChat, etc.) mount an
 * `<AnchorProvider>` for their canvas children, but the toolbar lives outside
 * that React tree — `useAnchors()` returns `{}` there. To let toolbar UIs
 * resolve `{{anchor.X}}` tokens (so the show-hide eye, target pickers, etc.
 * line up with what runtime sees), wrappers ALSO stamp the same map onto
 * their Craft node's `data.custom.anchors`. This util walks ancestors of a
 * given nodeId and returns the merged map (nearest wins per key, mirroring
 * `<AnchorProvider>` composition).
 */
import type { useEditor } from "@craftjs/core";
import type { AnchorMap } from "./anchorContext";

type Query = ReturnType<typeof useEditor>["query"];

export function getAnchorsForNode(nodeId: string, query: Query): AnchorMap {
  const merged: Record<string, string> = {};
  let current: string | null | undefined = nodeId;
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    let node: any;
    try {
      node = query.node(current).get();
    } catch {
      break;
    }
    const anchors = node?.data?.custom?.anchors as AnchorMap | undefined;
    if (anchors) {
      // Nearest ancestor's anchors should win — only fill keys we haven't seen.
      for (const k in anchors) {
        if (!(k in merged)) merged[k] = anchors[k];
      }
    }
    current = node?.data?.parent;
  }
  return merged;
}

const TOKEN_RE = /\{\{anchor\.([a-zA-Z0-9_-]+)\}\}/g;

export function resolveAnchorsForNode(
  value: string | undefined,
  nodeId: string | undefined,
  query: Query
): string | undefined {
  if (!value || !value.includes("{{anchor.") || !nodeId) return value;
  const map = getAnchorsForNode(nodeId, query);
  return value.replace(TOKEN_RE, (_, k) => map[k] ?? "");
}
