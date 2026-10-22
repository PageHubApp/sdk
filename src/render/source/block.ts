/**
 * Library block → an HTML-first section snippet (see docs/features/html-first-blocks.md).
 *
 * A block is stored as a hierarchical Craft structure (`{ type, props, children }`), not a node map, with an
 * optional `modifiers` table of class shortcuts. `blockToSource` flattens it into a node map, expands the
 * modifier tokens in every className, collects the invoker targets (`show-hide` / `open-modal`) the way
 * `convertSite` does, and runs the same `renderToSource` emitters a whole site goes through. The result is one
 * self-contained snippet: the editor's Blocks tab inserts it into a page as it is.
 *
 * Node ids are block-relative (`blk_<n>`), so a snippet's `ph-input-<id>` field ids repeat when the same block is
 * inserted twice; an author-set `attrs.id` repeats for the same reason.
 */
import type { SerializedNodes } from "../static/types";
import type { StaticRenderContext } from "../../utils/staticHtml";
import { migrateActions } from "../../utils/action";
import { expandStructureWithModifiers } from "../../utils/modifierUtils";
import { renderToSource } from "./toSource";

export interface BlockStructure {
  type: string;
  props?: Record<string, any>;
  children?: BlockStructure[];
}

export interface BlockModifiers {
  [componentType: string]: Array<{ name: string; classes?: string; requires?: string }>;
}

export interface BlockSourceResult {
  /** The Liquid + HTML snippet. */
  source: string;
  /** `/* report: … *‍/` notes: conditions the format can't decide at render time. */
  notes: string[];
}

/** The flat node map of a hierarchical structure, rooted at `blk_0`. A node's `props.custom` becomes its `custom`. */
function flatten(structure: BlockStructure): { nodes: SerializedNodes; rootId: string } {
  const nodes: Record<string, any> = {};
  let seq = 0;
  const walk = (s: BlockStructure, parent: string | null): string => {
    if (!s || typeof s.type !== "string") throw new Error('Block structure node has no "type".');
    const id = `blk_${seq++}`;
    const { custom, ...props } = (s.props && typeof s.props === "object" ? s.props : {}) as Record<string, any>;
    nodes[id] = { type: { resolvedName: s.type }, isCanvas: true, hidden: false, props, displayName: s.type, custom: custom ?? {}, parent, nodes: [], linkedNodes: {} };
    for (const child of s.children ?? []) nodes[id].nodes.push(walk(child, id));
    return id;
  };
  const rootId = walk(structure, null);
  return { nodes: nodes as SerializedNodes, rootId };
}

export function blockToSource(structure: BlockStructure, modifiers?: BlockModifiers | null, ctx: Partial<StaticRenderContext> = {}): BlockSourceResult {
  const { nodes, rootId } = flatten(expandStructureWithModifiers(structure, modifiers));

  const popoverTargets = new Set<string>();
  const dialogTargets = new Set<string>();
  for (const node of Object.values(nodes)) {
    for (const a of migrateActions((node as any)?.props || {})) {
      if (a.type === "open-modal" && (a as any).anchor) dialogTargets.add(String((a as any).anchor));
      else if (a.type === "show-hide" && (a as any).target && (a as any).direction !== "tab" && (a as any).trigger !== "hover") popoverTargets.add(String((a as any).target));
    }
  }
  const full: any = { view: "desktop", ...ctx, pageIndex: {}, popoverTargets, dialogTargets };
  const source = renderToSource(rootId, nodes, full);

  const notes = new Set<string>();
  for (const m of source.matchAll(/\/\* report: ([^*]+) \*\//g)) notes.add(m[1]!.trim());
  return { source, notes: [...notes] };
}
