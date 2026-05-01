import type { ToHTMLFn } from "../../utils/staticHtml";
import type { ResolvedComponentDef } from "../types";

/**
 * Process an array of component definitions for the static renderer.
 * Returns a map of name → toHTML function.
 */
export function processForStatic(defs: ResolvedComponentDef[]): Record<string, ToHTMLFn> {
  const resolver: Record<string, ToHTMLFn> = {};
  for (const def of defs) {
    resolver[def.name] = def.toHTML;
  }
  return resolver;
}
