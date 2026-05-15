/**
 * Static-HTML repeater for `Data` nodes.
 *
 * Walks `props.dataSource` like the React `useDataSource` hook does, but
 * purely synchronously off the pre-fetched `ctx.connectorData` (no network,
 * no React, no hooks). For each resolved item, re-renders the Data node's
 * children via `ctx.renderChildren` with `ctx.currentItem` set so the
 * existing `interpolate()` plumbing resolves `{{item.*}}` tokens per row.
 *
 * The wrapping element mirrors `Container.toHTML` (tag selection from
 * `props.type`, className, style, aria, handlers, state attrs). Adds three
 * runtime hooks the vanilla static-runtime + Wave-2 reconciler can read:
 *  - `data-connector-id="<provider>"` on the wrapper (connector-backed mode)
 *  - `data-binding-key="<bindingId>"`  on the wrapper (connector-backed mode)
 *  - `data-item-id="<id-or-index>"`    on each iteration's outermost child
 *  - `data-state-inputs` / `data-publish-state-keys` JSON on the wrapper when set
 *
 * Empty / unresolved items render an empty wrapper (matches React's
 * "skeleton card hidden until client fetch" behavior).
 */

import { migrateActions } from "../../utils/action";
import { resolveNestedItems } from "../../utils/data/resolveNestedItems";
import { applyRouteParamsToDataSource } from "../../utils/data/routeParamsDataSource";
import { dataSourceBindingId } from "../../utils/data/storefrontDataSource";
import {
  actionsAttr,
  ariaAttrs,
  getInlineStyle,
  handlerAttrs,
  stateAttrs,
  staticClasses,
  tag,
  type ToHTMLFn,
} from "../../utils/staticHtml";

interface DataSource {
  provider?: string;
  collection?: string;
  filter?: Record<string, string>;
  ids?: string[];
  sort?: string;
  offset?: number;
  limit?: number;
  scope?: string;
  splitBy?: string;
  bindingKey?: string;
  stateInputs?: Record<string, string>;
  publishStateKeys?: Record<string, string>;
}

/**
 * Pure copy of `useDataSource`'s `applyDataSourceScope` — server-side sort /
 * filter / paginate after the raw items come out of connectorData. Kept here
 * (not imported) because `useDataSource.tsx` imports React/hooks at module
 * scope and a single React import would poison the static-renderer build for
 * any non-React consumer (export-zip, harness, Node scripts).
 */
function applyDataSourceScope(items: any[] | null | undefined, ds: DataSource): any[] | null {
  if (!Array.isArray(items)) return null;
  let result = items;
  if (ds.ids?.length) {
    const idSet = new Set(ds.ids);
    result = result.filter(it => idSet.has(it?.id));
  }
  const isProductItemCollection =
    !ds.collection || ds.collection === "products" || ds.collection === "product";
  if (isProductItemCollection && ds.filter && Object.keys(ds.filter).length > 0) {
    const activeFilter = Object.entries(ds.filter).filter(([, v]) => v != null && v !== "");
    if (activeFilter.length > 0) {
      result = result.filter(it => {
        const md = it?.metadata;
        if (!md) return false;
        return activeFilter.every(([k, v]) => md[k] === v);
      });
    }
  }
  if (ds.sort) {
    result = [...result];
    switch (ds.sort) {
      case "alpha":
        result.sort((a, b) => String(a?.title ?? "").localeCompare(String(b?.title ?? "")));
        break;
      case "price_asc":
        result.sort((a, b) => (a?.price?.amount ?? 0) - (b?.price?.amount ?? 0));
        break;
      case "price_desc":
        result.sort((a, b) => (b?.price?.amount ?? 0) - (a?.price?.amount ?? 0));
        break;
      case "oldest":
        result.reverse();
        break;
    }
  }
  if (ds.offset && ds.offset > 0) result = result.slice(ds.offset);
  if (ds.limit && ds.limit > 0 && result.length > ds.limit) result = result.slice(0, ds.limit);
  return result;
}

function pickTag(type: unknown): string {
  if (typeof type !== "string") return "div";
  if (
    type === "section" ||
    type === "header" ||
    type === "footer" ||
    type === "nav" ||
    type === "aside" ||
    type === "main" ||
    type === "form" ||
    type === "details" ||
    type === "summary" ||
    type === "label" ||
    type === "ul" ||
    type === "ol" ||
    type === "li" ||
    type === "table" ||
    type === "thead" ||
    type === "tbody" ||
    type === "tfoot" ||
    type === "tr" ||
    type === "td" ||
    type === "th"
  )
    return type;
  if (type === "page") return "article";
  return "div";
}

export const toHTML: ToHTMLFn = (props, _children, ctx) => {
  if (props.type === "component" || props.type === "componentCanvas") return "";

  const ds: DataSource | undefined = props.dataSource;
  const childIds = ctx.repeaterChildIds || [];

  // Resolve items — `scope` reads from parent item, otherwise reads from
  // pre-fetched connectorData[provider].bindings[bindingId].
  let items: any[] | null = null;
  let bindingId: string | null = null;
  if (ds) {
    if (ds.scope) {
      items = resolveNestedItems(ctx.currentItem ?? null, ds.scope, ds.splitBy);
    } else if (ds.provider && ds.collection) {
      const merged = applyRouteParamsToDataSource(ds, {});
      bindingId = dataSourceBindingId(merged);
      const raw = ctx.connectorData?.[ds.provider]?.bindings?.[bindingId] ?? null;
      items = applyDataSourceScope(raw, merged);
    }
  }
  const hasItems = Array.isArray(items) && items.length > 0;

  // Build child HTML: one render per item with currentItem set, or fallback
  // pass-through (no dataSource / no items resolved at SSR — matches React's
  // "render template card" behavior so client fetch can hydrate).
  let childrenHTML = "";
  if (ds && hasItems) {
    const prevItem = ctx.currentItem;
    try {
      const chunks: string[] = [];
      for (let i = 0; i < items!.length; i++) {
        const item = items![i];
        ctx.currentItem = item;
        const itemHTML = ctx.renderChildren(childIds);
        // Stamp data-item-id on the first child element of the iteration
        // (best-effort string-level — the walker's children are siblings).
        // Splice it into the first `<tag` we find that doesn't already have
        // `data-item-id`. Falls back to wrapping in a fragment-style div.
        const idStr = String(item?.id ?? i);
        chunks.push(stampItemId(itemHTML, idStr));
      }
      childrenHTML = chunks.join("\n");
    } finally {
      ctx.currentItem = prevItem;
    }
  } else if (!ds) {
    // No dataSource — render children once as plain Container.
    childrenHTML = ctx.renderChildren(childIds);
  }

  // ── Item template (for client-side refetch DOM swap) ──────────────────
  // When this Data node declares `stateInputs`, the runtime will refetch and
  // need to render new items WITHOUT React. Emit a `<template
  // data-item-template>` whose innerHTML is the iteration markup with
  // `{{slot:<path>}}` placeholders for every `{{item.*}}` interpolation. The
  // runtime substitutes the placeholders per refetched item and replaces the
  // wrapper's child rows. Reconciler keeps DOM by `data-item-id`.
  let itemTemplateHTML = "";
  if (ds && (ds.stateInputs || ds.provider) && childIds.length > 0) {
    const prevItem = ctx.currentItem;
    try {
      ctx.currentItem = makeSlotProxy() as any;
      const rendered = ctx.renderChildren(childIds);
      ctx.currentItem = prevItem;
      // Stamp `data-item-id="{{slot:id}}"` on the first tag so the runtime
      // can reconcile by id when items change.
      itemTemplateHTML = stampItemId(rendered, "{{slot:id}}");
    } finally {
      ctx.currentItem = prevItem;
    }
  }
  // else: ds set but items unresolved (null/empty) — emit empty wrapper.
  // Client refetch via stateInputs (if any) populates on hydration.

  // ── Wrapper element (Container-style) ────────────────────────────────────
  const t = pickTag(props.type);
  const attrs: Record<string, any> = {
    class: staticClasses(props, ctx) || undefined,
    style: getInlineStyle(props) || undefined,
    id: props.id || props.anchor || undefined,
    ...ariaAttrs(props),
    ...handlerAttrs(props),
    ...(t === "form" ? {} : actionsAttr(props)),
    ...stateAttrs(props, ctx),
    action: t === "form" ? props.action || "" : undefined,
    method: t === "form" ? props.method || "POST" : undefined,
  };
  // Connector wiring for runtime refetch reconciler.
  if (ds?.provider) attrs["data-connector-id"] = ds.provider;
  if (bindingId) attrs["data-binding-key"] = bindingId;
  // Plain-text collection name (not the hashed bindingId) so the runtime can
  // build the same `?collection=` fetch param the React path does.
  if (ds?.collection) attrs["data-binding-collection"] = ds.collection;
  if (ds?.stateInputs && Object.keys(ds.stateInputs).length > 0) {
    attrs["data-state-inputs"] = JSON.stringify(ds.stateInputs);
  }
  // Pass-through attrs (mirror Container.toHTML).
  if (props.attrs && typeof props.attrs === "object") {
    for (const [k, v] of Object.entries(props.attrs)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        attrs[k] = v as any;
      }
    }
  }
  // Load-action stamping parity with Container.toHTML (Data nodes can carry
  // load-trigger show actions, e.g. cookie banners that happen to be repeaters).
  for (const la of migrateActions(props)) {
    if (la.type !== "show-hide") continue;
    if (la.trigger !== "load") continue;
    if (la.direction !== "show") continue;
    const targetId = props.id || props.anchor;
    if (la.target !== targetId) continue;
    attrs["data-ph-load-show"] = "";
    if (la.method === "style") attrs["data-ph-load-method"] = "style";
    if (Array.isArray(la.conditions) && la.conditions.length > 0) {
      attrs["data-ph-load-conditions"] = JSON.stringify(la.conditions);
    }
    ctx.hasLoadActions = true;
  }

  // Append item template (sibling of the iteration rows) when wired for
  // client-side refetch. <template> contents don't render but are accessible
  // to the runtime via `.content.firstElementChild`.
  const finalChildren = itemTemplateHTML
    ? childrenHTML + `<template data-item-template>${itemTemplateHTML}</template>`
    : childrenHTML;

  return tag(t, attrs, finalChildren);
};

/**
 * Synthetic item used to render the client-side item template. Any property
 * access (at any depth) returns a child proxy that, when coerced to a string
 * via interpolation, resolves to `{{slot:<dot.path>}}`. The runtime later
 * substitutes the slot markers with values from refetched items.
 *
 * Walker uses `in value` so we trap `has` to always return true; `get`
 * builds up the path. `Symbol.toPrimitive` / `toString` / `valueOf` return
 * the slot string so `String(item.foo.bar)` yields `"{{slot:foo.bar}}"`.
 *
 * `id` deliberately returns a non-proxy string ("{{slot:id}}") so the
 * iteration's `data-item-id` stamp works cleanly. All other paths produce
 * recursive proxies.
 */
function makeSlotProxy(path: string[] = []): any {
  const pathStr = path.join(".");
  const slotStr = pathStr ? `{{slot:${pathStr}}}` : "";
  const handler: ProxyHandler<any> = {
    has() {
      return true;
    },
    get(_target, key) {
      if (key === Symbol.toPrimitive) return () => slotStr;
      if (key === "toString" || key === "valueOf") return () => slotStr;
      if (typeof key === "symbol") return undefined;
      // Avoid wrapping JS engine introspection / array protocol props that
      // would otherwise be treated as paths.
      if (key === "constructor" || key === "then") return undefined;
      // `in value` returns true (above), and `Array.isArray` checks a hidden
      // symbol — we don't want to leak proxies into Array.isArray-checked
      // branches. Default: deeper proxy.
      return makeSlotProxy([...path, String(key)]);
    },
  };
  // Target is an empty object so `typeof item === "object"` holds (walkPath
  // requires it). Make the target stringify to the slot too.
  const target: any = {};
  target.toString = () => slotStr;
  target.valueOf = () => slotStr;
  return new Proxy(target, handler);
}

/**
 * Splice a `data-item-id="..."` attribute into the first child tag of an
 * iteration's HTML. Per-item id lets the runtime reconciler match SSR
 * elements to refetched items on client navigation.
 *
 * Cheap regex match — children always start with `<tag` because they're
 * produced by `tag(...)` in component toHTMLs. If no match, return unchanged.
 */
function stampItemId(html: string, itemId: string): string {
  if (!html) return html;
  return html.replace(/^(\s*<[a-z][a-z0-9-]*)\b/i, `$1 data-item-id="${itemId}"`);
}
