/**
 * Craft → HTML-first source converter (see docs/strategy/html-first-converter.md).
 *
 * The mirror of the static `renderToHTML` walker: the SAME tree walk, but each node emits
 * **Liquid + HTML source** instead of expanded output. `renderToSource(rootId, nodes, ctx)` returns
 * the `.liquid` source for a page; the standalone engine parses + renders it back to the DOM the
 * static walker produces today. Parity is gated by `scripts/converter/parity.mjs` (zero DOM diff).
 *
 * Styles / ids are produced with the same `getInlineStyle` helper the `toHTML` emitters use; classes
 * are kept verbatim (all breakpoints). The only other intentional difference is the DYNAMIC parts: a `Data`
 * repeater becomes `{% for %}` instead of expanded rows, a media id becomes `{{ id | image_url }}`,
 * a condition becomes `{% if %}`, etc. This file covers the leaf/structural types; the dynamic
 * emitters (Data, Form, actions) land on top of it, harness-gated, one at a time.
 */
import type { SerializedNodes } from "../static/types";
import { getInlineStyle, type StaticRenderContext } from "../../utils/staticHtml";
import { dataSource } from "./dataSource";
import { formSource, formElementSource } from "./formSource";
import { videoSource, audioSource, embedSource, mapSource, mapPointSource, mapPathSource } from "./mediaSource";
import { buttonSource, linkSource } from "./actionSource";

/** A node → its Liquid+HTML source. `childrenSource` is the already-emitted source of its children. */
export type ToSourceFn = (props: Record<string, any>, childrenSource: string, ctx: StaticRenderContext) => string;

/**
 * The element's class string, verbatim. Unlike the static walker's `staticClasses`, the converter
 * keeps EVERY class — including responsive (`md:` / `lg:`) and state variants — because the source is
 * one document for all breakpoints; the view-specific filtering the static HTML needs does not apply.
 */
function classString(props: Record<string, any>): string | undefined {
  const c = props.className;
  const s = typeof c === "string" ? c : Array.isArray(c) ? c.join(" ") : "";
  return s.trim() || undefined;
}

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

/** `<tag a="b">children</tag>`, or `<tag a="b">` for void elements. Attrs with nullish values are dropped. */
function el(tagName: string, attrs: Record<string, string | null | undefined>, children: string): string {
  const a = Object.entries(attrs)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, "&quot;")}"`)
    .join(" ");
  const open = `<${tagName}${a ? " " + a : ""}>`;
  return VOID.has(tagName) ? open : `${open}${children}</${tagName}>`;
}

/** Container `props.type` → HTML tag (mirrors Container.toHTML's mapping). */
const CONTAINER_TAGS = new Set(["section", "header", "footer", "nav", "aside", "main", "form", "details", "summary", "label", "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "td", "th"]);
function containerTag(type: unknown): string {
  if (type === "page") return "article";
  if (typeof type === "string" && CONTAINER_TAGS.has(type)) return type;
  return "div";
}

function sanitizeTagName(raw: unknown): string {
  if (typeof raw !== "string") return "div";
  const clean = raw.trim().toLowerCase();
  return /^[a-z][a-z0-9]*$/.test(clean) ? clean : "div";
}

/** The source emitters, keyed by node type — the `toSource` twin of `defaultResolver`. */
export const sourceResolver: Record<string, ToSourceFn> = {
  Container(props, children, ctx) {
    // Reusable components are lifted to partials and called with `{% render %}` (handled by the
    // walker's partial pass); inline they contribute nothing.
    if (props.type === "component" || props.type === "componentCanvas") return "";
    const t = containerTag(props.type);
    return el(t, { class: classString(props), style: getInlineStyle(props) || undefined, id: props.id || props.anchor || undefined }, children);
  },

  Text(props, _children, ctx) {
    const t = sanitizeTagName(props.tagName);
    // Keep the stored rich text verbatim: its `{{ item.* }}` / `<span data-variable>` tokens are
    // already the format's binding form, so they pass straight through to Liquid (NOT interpolated).
    const inner = typeof props.text === "string" ? props.text : "";
    return el(t, { class: classString(props), style: getInlineStyle(props) || undefined, id: props.id || undefined }, inner);
  },

  Image(props, _children, ctx) {
    const cls = classString(props);
    const content = props.src ?? props.content ?? "";
    const alt = typeof props.alt === "string" ? props.alt : typeof props.title === "string" ? props.title : "";
    // Inline SVG (icon) keeps its markup; a media id becomes the `image_url` filter so the renderer
    // resolves the same CDN URL the static walker baked in.
    if (props.type === "svg" && content) {
      return el("span", { class: cls, role: alt ? undefined : "presentation", "aria-label": alt || undefined }, String(content));
    }
    const src = /^(https?:|data:|\/)/.test(String(content)) ? String(content) : `{{ ${JSON.stringify(String(content))} | image_url }}`;
    return el("img", { class: cls, src, alt });
  },

  // Lazy ref: dataSource imports the walker from this module, so a direct ref would hit the cyclic
  // import's temporal-dead-zone; calling it at render time is past initialization.
  Data: (props, children, ctx) => dataSource(props, children, ctx),
  Form: formSource,
  FormElement: formElementSource,
  Video: videoSource,
  Audio: audioSource,
  Embed: embedSource,
  Map: mapSource,
  MapPoint: mapPointSource,
  MapPath: mapPathSource,
  Button: (props, children, ctx) => buttonSource(props, children, ctx),
  Link: (props, children, ctx) => linkSource(props, children, ctx),
};

/** A reusable-component slug for a `type:"component"` node (its saved-component ref or node id). */
export function componentSlug(props: Record<string, any>, nodeId: string): string {
  return String(props.component || props.savedComponent || nodeId);
}

/**
 * Emit the Liquid source for a node and its subtree. Conditions on a node wrap it in `{% if %}`.
 * Unknown types fall back to a `<div>` wrapper so the walk never drops a subtree silently.
 */
export function renderNodeToSource(nodeId: string, nodes: SerializedNodes, ctx: StaticRenderContext): string {
  const node = nodes[nodeId];
  if (!node || (node as any).hidden) return "";
  const props = node.props || {};
  const children = (node.nodes || []).map((id: string) => renderNodeToSource(id, nodes, ctx)).join("");
  // Expose the current node + the whole map so an emitter that needs its own children (e.g. Data,
  // which partitions template rows from the empty slot) can re-walk them instead of using the string.
  (ctx as any).nodes = nodes;
  (ctx as any).renderingNodeId = nodeId;
  const emit = sourceResolver[resolveType(node)];
  const body = emit ? emit(props, children, ctx) : el("div", {}, children);

  const groups = props.conditionGroups;
  if (Array.isArray(groups) && groups.length > 0) {
    const expr = conditionExpr(groups);
    if (expr) return `{% if ${expr} %}${body}{% endif %}`;
  }
  return body;
}

/** The registered component name for a node (Craft `displayName`/`type.resolvedName`). */
function resolveType(node: SerializedNodes[string]): string {
  const t: any = (node as any).type;
  return (typeof t === "string" ? t : t?.resolvedName) || (node as any).displayName || "Container";
}

/**
 * A `conditionGroups` structure → a Liquid boolean expression. Only the shapes that map cleanly to
 * a single `{% if %}` are emitted here; richer groups (nested any/all, non-mappable types) are
 * handled by the dedicated conditions pass and reported per site.
 */
function conditionExpr(groups: any[]): string | null {
  const terms: string[] = [];
  for (const g of groups) {
    for (const c of g?.conditions ?? []) {
      if (c?.type === "auth") terms.push(c.operator === "logged-out" ? "customer == blank" : "customer");
      // other condition types (url-param, device, state…) are added as their Liquid forms land
    }
  }
  return terms.length ? terms.join(" and ") : null;
}

/** The page's `.liquid` source: the root node's subtree. (Partial lifting + `{% render %}` next.) */
export function renderToSource(rootId: string, nodes: SerializedNodes, ctx: StaticRenderContext): string {
  return renderNodeToSource(rootId, nodes, ctx);
}
