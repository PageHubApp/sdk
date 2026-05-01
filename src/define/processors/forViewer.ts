import React from "react";
import type { ResolvedComponentDef } from "../types";

/**
 * Process an array of component definitions for the viewer.
 * Returns a plain resolver map (no .craft, no editor chrome).
 */
export function processForViewer(
  defs: ResolvedComponentDef[]
): Record<string, React.ComponentType> {
  const resolver: Record<string, React.ComponentType> = {};
  for (const def of defs) {
    resolver[def.name] = def.component;
  }
  return resolver;
}
