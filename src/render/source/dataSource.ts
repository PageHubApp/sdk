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
 *       `{% for item in <provider>.<collection> %}…{% endfor %}`
 *   - nested scope (iterate into the parent row):
 *       `{% for item in item.<path> %}…{% endfor %}`
 *     with `splitBy` → `{% for item in item.<path> | split: '<delim>' %}`
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
import type { SerializedNodes, StaticRenderContext } from "../static/types";
import { getInlineStyle } from "../../utils/staticHtml";
import { partitionDataChildIds } from "../../utils/data/emptySlot";
import { renderNodeToSource, type ToSourceFn } from "./toSource";

/** The subset of `props.dataSource` the loop form reads. */
interface DataSource {
  provider?: string;
  collection?: string;
  scope?: string;
  splitBy?: string;
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
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, "&quot;")}"`)
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
    return ds.splitBy ? `${base} | split: ${liquidStr(ds.splitBy)}` : base;
  }
  if (ds.provider && ds.collection) return `${ds.provider}.${ds.collection}`;
  return null;
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
 * `Data` node → Liquid source. A reusable-component slot contributes nothing
 * inline (lifted to a partial), matching Container/Data `toHTML`.
 */
export const dataSource: ToSourceFn = (props, childrenSource, ctx) => {
  if (props.type === "component" || props.type === "componentCanvas") return "";

  const tagName = containerTag(props.type);
  const attrs = {
    class: classString(props),
    style: getInlineStyle(props) || undefined,
    id: props.id || props.anchor || undefined,
  };

  const ds: DataSource | undefined = props.dataSource;
  const expr = ds ? loopExpr(ds) : null;

  // No dataSource (or an incomplete one) — plain Container-style pass-through:
  // children render once, no loop. Mirrors `Data.toHTML`'s `!ds` branch.
  if (!expr) return el(tagName, attrs, childrenSource);

  const { templateSource, emptySource } = splitChildren(ctx, childrenSource);
  const body = emptySource
    ? `{% for item in ${expr} %}${templateSource}{% else %}${emptySource}{% endfor %}`
    : `{% for item in ${expr} %}${templateSource}{% endfor %}`;
  return el(tagName, attrs, body);
};
