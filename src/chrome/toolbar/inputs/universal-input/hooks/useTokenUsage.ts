/**
 * useTokenUsage — scan the CraftJS tree for nodes that reference a CSS var
 * by `var(--name)` substring. Used by the VarPicker token editor to disable
 * rename and delete on tokens that are still in use.
 *
 * Match scope: substring search on each node's stringified `props`. Catches:
 * - `className` / `mobileClassName` / `tabletClassName` (and any other
 *   responsive className siblings)
 * - inline `style: { color: "var(--brand)" }`
 * - `attrs: { "data-x": "var(--brand)" }`
 * - any string field anywhere in a node's props
 *
 * Misses: indirect alias chains (`var(--alias)` where alias resolves to the
 * target token). PageHub doesn't have token aliases yet, so this is fine.
 */
import { useEditor } from "@craftjs/core";
import { useMemo } from "react";

export interface TokenUsageResult {
  /** Number of nodes referencing `var(--name)`. */
  count: number;
  /** Ids of those nodes (useful for "Show me where" UX). */
  nodeIds: string[];
}

/**
 * @param varName CSS var name including the leading `--` (e.g. `--container-padding`).
 *                Empty / null → returns a zero result without scanning.
 */
export function useTokenUsage(varName: string | null | undefined): TokenUsageResult {
  // Pull every node's props payload into a stable serializable form so we can
  // memoize the substring search against tree changes only. Craft's useEditor
  // selector already re-runs on tree mutation, so anything we return from it
  // is naturally cache-invalidated when nodes mutate.
  const nodesSnapshotRaw = useEditor(state => {
    const out: { id: string; serialized: string }[] = [];
    for (const id of Object.keys(state.nodes)) {
      const props = state.nodes[id]?.data?.props ?? {};
      // JSON.stringify is fast on typical PageHub nodes (low-hundreds total)
      // and produces a string we can substring-search uniformly across all
      // string-shaped values regardless of which prop holds them.
      try {
        out.push({ id, serialized: JSON.stringify(props) });
      } catch {
        /* skip — circular / unserializable, very rare */
      }
    }
    return out;
  });

  // Craft's useEditor selector serializes arrays as object-with-numeric-keys
  // in some scope shapes — same defensive normalization used by useDesignVars.
  const nodesSnapshot: { id: string; serialized: string }[] = useMemo(() => {
    if (Array.isArray(nodesSnapshotRaw)) return nodesSnapshotRaw;
    if (nodesSnapshotRaw && typeof nodesSnapshotRaw === "object") {
      return Object.keys(nodesSnapshotRaw as any)
        .filter(k => !isNaN(Number(k)))
        .map(k => (nodesSnapshotRaw as any)[k])
        .filter(
          (entry: any) =>
            entry && typeof entry === "object" && "id" in entry && "serialized" in entry
        );
    }
    return [];
  }, [nodesSnapshotRaw]);

  return useMemo(() => {
    if (!varName) return { count: 0, nodeIds: [] };
    const needle = `var(${varName})`;
    const ids: string[] = [];
    for (const { id, serialized } of nodesSnapshot) {
      if (serialized.includes(needle)) ids.push(id);
    }
    return { count: ids.length, nodeIds: ids };
  }, [varName, nodesSnapshot]);
}
