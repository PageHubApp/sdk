/**
 * Reusable components in the Craft → HTML-first converter.
 *
 * In a Craft site a reusable component is a `type:"component"` Container under ROOT (the MASTER); its first child is
 * the content node. Every place it is used holds a clone (an INSTANCE) whose root carries
 * `props.relation.belongsTo = <content node id>` (`setRecursiveBelongsTo`), kept in step with the master by the editor.
 * The master itself never renders on a page (`containerSource` emits nothing for `type:"component"`).
 *
 * In HTML-first a component is a partial (`partials/<slug>.liquid`) and an instance is `{% render '<slug>' %}`, the
 * editor's own model (`component.convert` / `component.unlink`), so editing the partial edits every use. The
 * converter therefore:
 *
 *   - lifts each master's children into its partial, named from the component's display name (never rendered as
 *     site chrome: a master is not on any page);
 *   - emits `{% render %}` for each fully linked instance root, passing `item` / `forloop` when the partial reads
 *     them (a partial has its own scope, and an instance inside a repeater reads the row);
 *   - keeps a `style` / `content` linked instance inline (those carry per-instance overrides a plain `{% render %}`
 *     can't express) and reports it, so the migration lists it per site.
 */
import type { SerializedNode, SerializedNodes } from "../static/types";
import type { StaticRenderContext } from "../../utils/staticHtml";

/** One reusable component: its master container, the content node instances link to, and its partial name. */
export interface ComponentPartial {
  masterId: string;
  contentId: string;
  slug: string;
  name: string;
}

/** Names the converter itself writes into `partials/`, which a component must not take. */
export const RESERVED_PARTIALS = ["header", "footer", "head", "inject-head", "inject-footer"] as const;

/** Lowercase, hyphen-separated, filename / `{% render %}`-safe. */
export function partialSlug(raw: string): string {
  const s = String(raw).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return s || "component";
}

export const isComponentMaster = (node: SerializedNode | undefined) => (node?.props || {}).type === "component";

/**
 * The reusable components of a tree, in ROOT order, each with a unique partial slug. `taken` holds the names already
 * in use (and gets these added), so the components and the converter's own partials never share a file.
 */
export function collectComponents(rootId: string, nodes: SerializedNodes, taken: Set<string> = new Set(RESERVED_PARTIALS)): ComponentPartial[] {
  const out: ComponentPartial[] = [];
  const childIds: string[] = Array.isArray(nodes[rootId]?.nodes) ? (nodes[rootId]!.nodes as string[]) : [];
  for (const id of childIds) {
    const node = nodes[id];
    if (!node || (node as any).hidden || !isComponentMaster(node)) continue;
    const contentId = (node.nodes || [])[0];
    if (!contentId) continue;
    const props = node.props || {};
    const name = String((node as any).custom?.displayName || props.component || props.savedComponent || "Component");
    const base = partialSlug(name);
    let slug = base;
    for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
    taken.add(slug);
    out.push({ masterId: id, contentId, slug, name });
  }
  return out;
}

/** The partial's text: the master's children (the `type:"component"` wrapper is editor-only). */
export function componentPartialSource(
  component: ComponentPartial,
  nodes: SerializedNodes,
  ctx: StaticRenderContext,
  renderNode: (id: string, nodes: SerializedNodes, ctx: StaticRenderContext) => string,
): string {
  return (nodes[component.masterId]?.nodes || []).map((c) => renderNode(c, nodes, ctx)).join("");
}

interface ComponentCtx {
  /** content node id → its component, set by `convertSite` before anything is rendered. */
  components?: Map<string, ComponentPartial>;
  /** partial slug → its text, so an instance can pass the loop variables the partial reads. */
  componentSources?: Map<string, string>;
  reports?: Set<string>;
}

/** Install the components on the render context (the instance hook reads them). */
export function setComponents(ctx: StaticRenderContext, components: readonly ComponentPartial[]): void {
  const c = ctx as unknown as ComponentCtx;
  c.components = new Map(components.map((x) => [x.contentId, x]));
  c.componentSources ??= new Map();
}

/** Record a component's converted text (for `instanceSource`'s argument check). */
export function setComponentSource(ctx: StaticRenderContext, slug: string, text: string): void {
  ((ctx as unknown as ComponentCtx).componentSources ??= new Map()).set(slug, text);
}

/**
 * The `{% render %}` tag for a linked instance root, or null when `node` is not one (render it as usual). A
 * `style` / `content` instance is reported and rendered inline (null).
 */
export function instanceSource(node: SerializedNode, ctx: StaticRenderContext): string | null {
  const c = ctx as unknown as ComponentCtx;
  const rel = (node.props || {}).relation;
  const belongsTo = rel && typeof rel === "object" ? (rel as any).belongsTo : undefined;
  if (!belongsTo || !c.components?.size) return null;
  const component = c.components.get(String(belongsTo));
  if (!component) return null;
  const kind = (rel as any).relationType;
  if (kind === "style" || kind === "content") {
    c.reports?.add(`component "${component.name}": a ${kind}-linked copy keeps its own ${kind === "style" ? "styles" : "text"}, converted as a separate copy`);
    return null;
  }
  const text = c.componentSources?.get(component.slug) ?? "";
  const pass = ["item", "forloop"].filter((v) => new RegExp(`\\b${v}\\b`).test(text)).map((v) => `, ${v}: ${v}`).join("");
  return `{% render '${component.slug}'${pass} %}`;
}
