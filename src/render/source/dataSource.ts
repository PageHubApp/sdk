/**
 * Craft → HTML-first source emitter for `Data` (repeater) nodes.
 *
 * The `toSource` twin of `Data.toHTML.ts`. Where the expander walks
 * `props.dataSource`, resolves the rows off `ctx.connectorData` and emits one
 * expanded copy of the children per item, this emits the **source** instead:
 * a single `{% for item in … %}` loop whose body is the children emitted ONCE,
 * with their `{{item.*}}` tokens kept verbatim (they already match the format).
 *
 *   - connector-backed (`provider` + `collection`):
 *       `{% for item in collections.<slug> %}` / `{% for item in products %}…{% endfor %}`
 *   - nested scope (iterate into the parent row):
 *       `{% for item in item.<path> %}…{% endfor %}`
 *     (a string is split by `splitBy`; primitives become `{ value, … }` rows)
 *       → `{% assign rows = item.<path> | data_items: '<delim>' %}{% for item in rows %}`
 *   - empty slot (a child flagged `custom.dataRole: "empty"`): the Liquid
 *     `{% else %}` branch of the loop — the format's "no rows" form.
 *
 * The wrapper is ONE element — the same tag a Container emits for `props.type`
 * (default `div`) carrying the node's class / inline style / id — reusing the
 * same `classString` / `getInlineStyle` / `el` shape as `toSource.ts`. The
 * runtime hooks the expander bakes in (`data-connector-id`, `data-binding-key`,
 * per-row `data-item-id`) are NOT source: the engine regenerates them when it
 * expands the `{% for %}`, so the authoring form stays clean and 1:1.
 */
import { CHAT_TURNS_SCOPE } from "./anchors";
import { chatTurnsSource } from "./chatSource";
import { liquidizeBindings } from "./bindings";
import type { StaticRenderContext } from "../../utils/staticHtml";
import type { SerializedNodes } from "../static/types";
import { getInlineStyle } from "../../utils/staticHtml";
import { partitionDataChildIds } from "../../utils/data/emptySlot";
import { renderNodeToSource, type ToSourceFn } from "./toSource";
import { interactiveAttrs } from "./actionSource";

/** The subset of `props.dataSource` the loop form reads. */
interface DataSource {
  provider?: string;
  collection?: string;
  scope?: string;
  splitBy?: string;
  /** Field → value the collection is filtered by (detail pages: `{ slug: "{{params.slug}}" }`). */
  filter?: Record<string, unknown>;
  /** Max rows (detail pages carry `limit: 1` for the single matched item). */
  limit?: number;
  /** A `<collection>.facets` feed: the comma-separated facet keys (narrowing the collection's facetable fields). */
  facetKeys?: string;
  sort?: string;
  /** `{ <fetchOption>: <stateKey> }`: the state the old client refetch read (`url:<param>` keys are the visitor's URL). */
  stateInputs?: Record<string, string>;
  /** Where the old client refetch published the listing's totals (`{{state.<key>}}` pagination text). */
  publishStateKeys?: { totalPages?: string; totalCount?: string; page?: string; count?: string };
}

// ── URL-driven listings (`stateInputs`) ─────────────────────────────────────
//
// A storefront grid whose filters, search, sort and pagination live in the URL (`stateInputs: { category:
// "url:category", page: "url:page" }`) becomes `query['<slug>?<options>&in=<params>']`, the global the host fills
// from the request's query string (pagehub.dev utils/htmlFirst/queryListing.ts). The element gets
// `data-refetch="<params>"`, so the runtime's `refetch` chunk re-renders it in place when those `url:` keys change,
// and `data-state-seed` for the totals its `publishStateKeys` named.

/** The collections a URL-driven listing can read: a CMS collection, or the catalog (the site's `products`). */
function querySlug(ds: DataSource): string | null {
  if (ds.scope || !ds.collection || ds.collection.endsWith(".facets") || ds.collection.endsWith(".categories")) return null;
  if (ds.provider === "collection") return ds.collection;
  if (ds.provider === "stripe" && ds.collection === "products") return "products";
  return null;
}

/** The URL params a binding's `stateInputs` read: `opt` (param = opt) or `opt:param`. Non-URL state is not the URL's. */
function urlInputs(ds: DataSource): string[] {
  const out: string[] = [];
  for (const [opt, key] of Object.entries(ds.stateInputs || {})) {
    if (typeof key !== "string" || !key.startsWith("url:")) continue;
    const param = key.slice(4);
    if (!/^[\w.-]+$/.test(opt) || !/^[\w.-]+$/.test(param)) continue;
    out.push(param === opt ? opt : `${opt}:${param}`);
  }
  return out;
}

/** The `query[...]` key for a URL-driven listing, with the params it refetches on; null for any other binding. */
export function queryListingKey(ds: DataSource): { key: string; params: string[] } | null {
  const slug = querySlug(ds);
  const inputs = slug ? urlInputs(ds) : [];
  if (!slug || !inputs.length) return null;
  // The catalog's grid also follows every facet selection (`url:facet.<key>`), as the old client refetch did.
  if (slug === "products" && !inputs.includes("facet.*")) inputs.push("facet.*");
  const fixed = new URLSearchParams();
  if (typeof ds.limit === "number" && ds.limit > 0) fixed.set("limit", String(ds.limit));
  if (typeof ds.sort === "string" && ds.sort) fixed.set("sort", ds.sort);
  if (typeof ds.facetKeys === "string" && ds.facetKeys) fixed.set("facetKeys", ds.facetKeys);
  for (const [k, v] of Object.entries(ds.filter || {})) {
    // A route-param binding (`{{params.slug}}`) is applied in Liquid after the read; a literal is the binding's own.
    if (typeof v === "string" && v && !v.includes("{{") && /^[\w.-]+$/.test(k)) fixed.set(`filter.${k}`, v);
  }
  fixed.set("in", inputs.join(","));
  const key = `${slug}?${fixed.toString().replace(/%2C/gi, ",").replace(/%3A/gi, ":").replace(/%2A/gi, "*")}`;
  if (key.includes("'")) return null;
  return { key, params: inputs.map((i) => i.split(":").pop()!) };
}

/**
 * `data-state-seed` for the totals the old refetch published: `key=value;…`, rendered with the listing. `metaVar` /
 * `rowsVar` are Liquid variables assigned before the element (an attribute token may not index with `[…]`).
 */
function stateSeed(ds: DataSource, metaVar: string, rowsVar: string): string | undefined {
  const pub = ds.publishStateKeys || {};
  const meta = metaVar;
  const rowsExpr = rowsVar;
  const parts: string[] = [];
  if (pub.totalPages) parts.push(`${pub.totalPages}={{ ${meta}.totalPages }}`);
  if (pub.totalCount) parts.push(`${pub.totalCount}={{ ${meta}.totalCount }}`);
  if (pub.page) parts.push(`${pub.page}={{ ${meta}.page }}`);
  if (pub.count) parts.push(`${pub.count}={{ ${rowsExpr} | size }}`);
  return parts.length ? parts.join(";") : undefined;
}

// ── Element helpers (mirrors toSource.ts; replicated so this file stays additive) ──

/** The element's class string, verbatim (every breakpoint — the source is one document). */
function classString(props: Record<string, any>): string | undefined {
  const c = props.className;
  const s = typeof c === "string" ? c : Array.isArray(c) ? c.join(" ") : "";
  return s.trim() || undefined;
}

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

/** `<tag a="b">children</tag>`. Attrs with nullish/empty values are dropped. */
function el(tagName: string, attrs: Record<string, string | null | undefined>, children: string): string {
  const a = Object.entries(attrs)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}="${liquidizeBindings(String(v)).replace(/"/g, "&quot;")}"`)
    .join(" ");
  const open = `<${tagName}${a ? " " + a : ""}>`;
  return VOID.has(tagName) ? open : `${open}${children}</${tagName}>`;
}

/** Container `props.type` → HTML tag (mirrors toSource.ts / Container.toHTML). */
const CONTAINER_TAGS = new Set(["section", "header", "footer", "nav", "aside", "main", "form", "details", "summary", "label", "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "td", "th"]);
function containerTag(type: unknown): string {
  if (type === "page") return "article";
  if (typeof type === "string" && CONTAINER_TAGS.has(type)) return type;
  return "div";
}

// ── Loop source ──────────────────────────────────────────────────────────────

/** A Liquid single-quoted string literal. */
function liquidStr(s: string): string {
  return `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

/**
 * A dataSource filter VALUE → a Liquid expression for `where`. A route-param binding
 * (`{{params.slug}}`) becomes `request.params.slug`; any other `{{ expr }}` passes its inner
 * expression through; a plain value is a string literal.
 */
function filterValueExpr(raw: unknown): string {
  const v = String(raw ?? "");
  const param = v.match(/^\s*\{\{-?\s*params\.([A-Za-z0-9_]+)\s*-?\}\}\s*$/);
  if (param) return `request.params.${param[1]}`;
  const binding = v.match(/^\s*\{\{-?\s*([\s\S]+?)\s*-?\}\}\s*$/);
  if (binding) return binding[1]!.trim();
  return liquidStr(v);
}

/** Append `| where: 'field', <value>` for each filter entry onto a collection expression. */
function withFilters(expr: string, filter?: Record<string, unknown>): string {
  let out = expr;
  for (const [field, val] of Object.entries(filter || {})) {
    out += ` | where: ${liquidStr(field)}, ${filterValueExpr(val)}`;
  }
  return out;
}

/**
 * The collection expression that follows `for item in`, or `null` when the
 * dataSource doesn't describe a loop (incomplete / pass-through). Scope wins
 * over a connector binding, mirroring `Data.toHTML`'s resolution order.
 */
function loopExpr(ds: DataSource): string | null {
  if (ds.scope) {
    // A `state:<key>` array lives at a top-level key in the format; everything
    // else iterates INTO the current row, so anchor it on `item.`.
    if (ds.scope.startsWith("state:")) {
      const key = ds.scope.slice("state:".length).trim();
      return key || null;
    }
    const path = ds.scope.replace(/^item\./, "");
    if (!path) return null;
    const base = `item.${path}`;
    // `data_items` splits a string (when `splitBy`) and wraps primitives as `{ value, title, slug, src,
    // image }` — what the walker's `resolveNestedItems` did. Filters are IGNORED in a `{% for %}`
    // collection expression, so the caller assigns this to a variable first.
    return `${base} | data_items${ds.splitBy ? `: ${liquidStr(ds.splitBy)}` : ""}`;
  }
  if (ds.provider && ds.collection) return globalExpr(ds.provider, ds.collection);
  return null;
}

/** The Stripe catalog's globals (html-first.md objects table): `products`, `product`, `product_categories`. */
const STRIPE_GLOBALS: Record<string, string> = {
  products: "products",
  product: "product",
  "products.categories": "product_categories",
  "products.facets": "product_facets",
};

/**
 * The Liquid global a connector feed is read from. The CMS collections are `collections.<slug>`, the
 * Stripe catalog is the top-level `products` / `product` / `product_categories`; any other provider
 * (customer, …) keeps `<provider>.<name>`.
 */
function globalExpr(provider: string, collection: string): string {
  if (provider === "collection") return `collections.${collection}`;
  if (provider === "stripe") return STRIPE_GLOBALS[collection] ?? collection;
  return `${provider}.${collection}`;
}

const FACETS_SUFFIX = ".facets";

/**
 * A `<collection>.facets` feed with named `facetKeys` → the PRODUCT collection, filtered, then folded into
 * facet rows by the engine's `facets` filter. The live connector applies `dataSource.filter` to the products
 * the facets are counted over (not to the facet rows), so a filter on a facets feed must run before the
 * fold. Returns `null` for any other source (or a facets feed with no keys, which stays the precomputed feed).
 */
function facetsExpr(ds: DataSource): { base: string; keys: string } | null {
  if (ds.scope || !ds.provider || !ds.collection?.endsWith(FACETS_SUFFIX)) return null;
  const keys = String(ds.facetKeys || "").split(",").map((k) => k.trim()).filter(Boolean);
  if (!keys.length) return null;
  return { base: globalExpr(ds.provider, ds.collection.slice(0, -FACETS_SUFFIX.length)), keys: keys.join(",") };
}

/**
 * The Data node's child ids, for splitting template rows from the empty slot.
 * Prefers `ctx.repeaterChildIds` (set by the walker around a Data node, exactly
 * as the `toHTML` walker does); falls back to the node under
 * `ctx.renderingNodeId`. `null` → ids aren't recoverable here.
 */
function repeaterChildIds(ctx: StaticRenderContext): string[] | null {
  if (Array.isArray(ctx.repeaterChildIds)) return ctx.repeaterChildIds;
  const id = ctx.renderingNodeId;
  const node = id ? ctx.nodes?.[id] : null;
  return node && Array.isArray(node.nodes) ? (node.nodes as string[]) : null;
}

/**
 * Split the loop body into the repeated template source and the empty-slot
 * source. When child ids are recoverable, each group is re-emitted through
 * `renderNodeToSource` (the twin of `Data.toHTML` re-rendering via
 * `ctx.renderChildren`); otherwise the pre-joined `childrenSource` is the whole
 * template body and there's no empty branch.
 */
function splitChildren(
  ctx: StaticRenderContext,
  childrenSource: string
): { templateSource: string; emptySource: string } {
  const childIds = repeaterChildIds(ctx);
  if (!childIds) return { templateSource: childrenSource, emptySource: "" };
  const nodes = (ctx.nodes || {}) as SerializedNodes;
  const { templateChildIds, emptyChildIds } = partitionDataChildIds(
    childIds,
    id => nodes[id]?.custom?.dataRole
  );
  const emit = (ids: string[]) => ids.map(id => renderNodeToSource(id, nodes, ctx)).join("");
  return { templateSource: emit(templateChildIds), emptySource: emit(emptyChildIds) };
}

/**
 * A URL-driven listing: rows and meta assigned from `query[…]` / `query_meta[…]` ahead of the element, a route-param
 * filter applied in Liquid, the loop, and the element marked for the runtime's in-place refetch.
 */
function queryListingSource(
  ds: DataSource,
  listing: { key: string; params: string[] },
  tagName: string,
  attrs: Record<string, string | undefined>,
  childrenSource: string,
  ctx: StaticRenderContext
): string {
  // The node's own id, read before the children re-walk (it moves `ctx.renderingNodeId`).
  const id = String(ctx.renderingNodeId || "x").replace(/[^A-Za-z0-9]/g, "_");
  const { templateSource, emptySource } = splitChildren(ctx, childrenSource);
  const rowsVar = `rows_${id}`;
  const metaVar = `meta_${id}`;
  const bound = Object.fromEntries(Object.entries(ds.filter || {}).filter(([, v]) => typeof v === "string" && v.includes("{{")));
  // Ahead of the element (and of any visibility gate on it): `renderNodeToSource` puts `ctx.pre` in front of the node.
  ((ctx as any).pre ??= []).push(
    `{% assign ${rowsVar} = ${withFilters(`query['${listing.key}']`, bound)} %}{% assign ${metaVar} = query_meta['${listing.key}'] %}`
  );
  const loop = `{% for item in ${rowsVar} %}${templateSource}${emptySource ? `{% else %}${emptySource}` : ""}{% endfor %}`;
  const seed = stateSeed(ds, metaVar, rowsVar);
  return el(tagName, { ...attrs, id: attrs.id || `ph-list-${id}`, "data-refetch": listing.params.join(","), ...(seed ? { "data-state-seed": seed } : {}) }, loop);
}

/**
 * `Data` node → Liquid source. A reusable-component slot contributes nothing
 * inline (lifted to a partial), matching Container/Data `toHTML`.
 */
export const dataSource: ToSourceFn = (props, childrenSource, ctx) => {
  if (props.type === "component" || props.type === "componentCanvas") return "";
  // The chat's message list is drawn by the runtime from a row template, not a Liquid loop (chatSource.ts).
  if (props.dataSource?.scope === CHAT_TURNS_SCOPE) return chatTurnsSource(props, ctx);

  const tagName = containerTag(props.type);
  const attrs = {
    class: classString(props),
    style: getInlineStyle(props) || undefined,
    id: props.id || props.anchor || undefined,
    // Pass-through `props.attrs` (id, data-*, role, aria-*) + handlers, same as `containerSource`.
    // Without this a `Data` wrapper drops its `attrs.id`, breaking scripts / CSS that target it
    // (e.g. a carousel's arrows + scrollbar-hide CSS keyed on `#reel-track`). Tag stays the loop
    // wrapper — a link action never turns the repeater into an `<a>`.
    ...interactiveAttrs(props, ctx).attrs,
  };

  const ds: DataSource | undefined = props.dataSource;
  const listing = ds ? queryListingKey(ds) : null;
  if (ds && listing) return queryListingSource(ds, listing, tagName, attrs, childrenSource, ctx);
  const expr = ds ? loopExpr(ds) : null;

  // No dataSource (or an incomplete one) — plain Container-style pass-through:
  // children render once, no loop. Mirrors `Data.toHTML`'s `!ds` branch.
  if (!expr) return el(tagName, attrs, childrenSource);

  const { templateSource, emptySource } = splitChildren(ctx, childrenSource);

  // A filter (detail pages: `where slug == params.slug`) can't be applied inline in a `{% for %}`
  // collection expression — liquid needs it assigned first. Assign the filtered array to a per-node
  // variable, then loop that. `limit` (e.g. the single detail item) is a `{% for %}` parameter.
  const filter = ds!.filter && Object.keys(ds!.filter).length ? ds!.filter : null;
  const facets = facetsExpr(ds!);
  let source = expr;
  let prefix = "";
  if (facets || filter || expr.includes(" | ")) {
    const varName = `rows_${String(ctx.renderingNodeId || "x").replace(/[^A-Za-z0-9]/g, "_")}`;
    const assigned = facets
      ? `${withFilters(facets.base, filter ?? undefined)} | facets: ${liquidStr(facets.keys)}`
      : withFilters(expr, filter ?? undefined);
    prefix = `{% assign ${varName} = ${assigned} %}`;
    source = varName;
  }
  const forOpen = `{% for item in ${source}${typeof ds!.limit === "number" ? ` limit: ${ds!.limit}` : ""} %}`;
  const body = emptySource
    ? `${prefix}${forOpen}${templateSource}{% else %}${emptySource}{% endfor %}`
    : `${prefix}${forOpen}${templateSource}{% endfor %}`;
  return el(tagName, attrs, body);
};
