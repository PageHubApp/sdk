/**
 * Tiny, dependency-free lookup module for built-in component metadata.
 *
 * Why this exists separate from `core/componentRegistry.ts` — that file
 * statically imports every component implementation (`Audio`, `Container`,
 * etc.) plus `BUILTIN_COMPONENT_DEFS`. Anything that pulls it transitively
 * (e.g. `applyPeerClassInherit`, `spatialPlacement`, `AutoChildListGroups`,
 * `LayerHeader`) drags the whole `*.craft.tsx` graph into its eval order.
 * When that consumer is reachable from a `*.craft.tsx` `settings` panel,
 * the cycle closes through `definitions.ts` and TDZs `AutomaticDef` /
 * `ContainerDef` in production. See
 * [.claude/known-issues/sdk-circular-import-via-lib.md].
 *
 * This module imports nothing. `builtinComponentDefs.ts` registers defs
 * via {@link setBuiltinDefsLookup} at module load.
 */

import type { ResolvedComponentDef } from "../define";

let _defs: ResolvedComponentDef[] | undefined;

export function setBuiltinDefsLookup(defs: ResolvedComponentDef[]) {
  _defs = defs;
}

export function getBuiltinComponentDef(
  name: string,
): ResolvedComponentDef | undefined {
  if (!name || !_defs) return undefined;
  return _defs.find((d) => d.name === name);
}

// ─── Spatial layout hints ──────────────────────────────────────────────────
// Hardcoded per-component overrides for the 2D drag algorithm. Defaults —
// null / false — fall back to DOM-derived flex direction and normal
// cross-axis zones.

const SPATIAL_MAIN_AXIS_BY_NAME: Record<string, "row" | "column"> = {
  Grid: "row",
  TableRow: "row",
  TableSection: "column",
  Table: "column",
};

const SUPPRESS_CROSS_AXIS_ALIGN_BY_NAME: Record<string, true> = {
  Table: true,
  TableSection: true,
  TableRow: true,
  TableCell: true,
};

export function getSpatialMainAxisForComponentName(
  name: string | undefined,
): "row" | "column" | null {
  if (!name) return null;
  return SPATIAL_MAIN_AXIS_BY_NAME[name] ?? null;
}

export function getSuppressCrossAxisAlignForComponentName(
  name: string | undefined,
): boolean {
  if (!name) return false;
  return SUPPRESS_CROSS_AXIS_ALIGN_BY_NAME[name] ?? false;
}
