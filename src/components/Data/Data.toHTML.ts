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
import { partitionDataChildIds } from "../../utils/data/emptySlot";
import { resolveNestedItems } from "../../utils/data/resolveNestedItems";
import { applyRouteParamsToDataSource } from "../../utils/data/routeParamsDataSource";
import { dataSourceBindingId } from "../../utils/data/storefrontDataSource";
import { isSlotItem, makeSlotProxy } from "../../utils/data/slotItem";
import { applyDataSourceScope, clientFetchOptions } from "../../utils/data/dataSourceScope";
import {
  actionsAttr,
  ariaAttrs,
  escapeAttr,
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
  facetKeys?: string;
  scope?: string;
  splitBy?: string;
  bindingKey?: string;
  stateInputs?: Record<string, string>;
  publishStateKeys?: Record<string, string>;
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
  // Split children into the repeater template vs the empty-state slot
  // (`custom.dataRole: "empty"`). Only Data nodes with a dataSource repeat, so
  // the split is a no-op for plain pass-through.
  const { templateChildIds, emptyChildIds } = ds
    ? partitionDataChildIds(childIds, id => ctx.nodes?.[id]?.custom?.dataRole)
    : { templateChildIds: childIds, emptyChildIds: [] as string[] };

  // Resolve items — `scope` reads from parent item, otherwise reads from
  // pre-fetched connectorData[provider].bindings[bindingId].
  let items: any[] | null = null;
  let bindingId: string | null = null;
  let bindingMeta: unknown = null;
  // An `item.*` scope inside a client item template: the parent row only
  // exists in the browser, so this repeater ships its own template and the
  // runtime expands it per row (`data-scope-path`).
  const nestedSlotScope =
    !!ds?.scope && !ds.scope.startsWith("state:") && isSlotItem(ctx.currentItem);
  if (ds) {
    if (nestedSlotScope) {
      items = null;
    } else if (ds.scope) {
      items = resolveNestedItems(ctx.currentItem ?? null, ds.scope, ds.splitBy);
    } else if (ds.provider && ds.collection) {
      const merged = applyRouteParamsToDataSource(ds, ctx.routeParams ?? {});
      bindingId = dataSourceBindingId(merged);
      const raw = ctx.connectorData?.[ds.provider]?.bindings?.[bindingId] ?? null;
      items = applyDataSourceScope(raw, merged);
      bindingMeta = (ctx.connectorData as any)?.[ds.provider]?.bindingsMeta?.[bindingId] ?? null;
    }
  }
  const hasItems = Array.isArray(items) && items.length > 0;
  // Definitively empty at build time — the binding fetched `[]` (not merely
  // unresolved/`null`, which stays a skeleton for client hydration).
  const isEmpty = Array.isArray(items) && items.length === 0;

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
        const itemHTML = ctx.renderChildren(templateChildIds);
        // Stamp data-item-id on the first child element of the iteration
        // (best-effort string-level — the walker's children are siblings).
        // Splice it into the first `<tag` we find that doesn't already have
        // `data-item-id`. Falls back to wrapping in a fragment-style div.
        const idStr = String(item?.id ?? i);
        // Rows whose actions read the whole item at runtime (add-to-cart needs the
        // priceId; computed bindings read variantMapJson; chips interpolate) carry
        // it as `data-item-json` — `data-item-id` alone resolves to `{ id }`.
        // Other rows skip it to keep page weight down.
        const needsItem = ITEM_CONTEXT_RE.test(itemHTML) && item && typeof item === "object";
        chunks.push(stampItemId(itemHTML, idStr, needsItem ? JSON.stringify(item) : undefined));
      }
      childrenHTML = chunks.join("\n");
    } finally {
      ctx.currentItem = prevItem;
    }
  } else if (ds && isEmpty && emptyChildIds.length > 0) {
    // Binding resolved to nothing — render the author's empty-state slot once
    // (no item context), mirroring React's `useDataSource` empty branch.
    childrenHTML = ctx.renderChildren(emptyChildIds);
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
  //
  // State-scoped repeaters iterate a JSON array sitting in the state registry:
  // either named outright (`scope: "state:<key>"`) or an item-relative scope
  // (`scope: "turns"`) under a wrapper whose item lives in state rather than
  // at SSR (`ctx.stateItem`, from a `staticScope` — e.g. a chat widget whose
  // turns only the browser knows). The latter binds to `<stateItem>:<scope>`.
  const stateScopeKey = !ds?.scope
    ? null
    : ds.scope.startsWith("state:")
      ? ds.scope.slice("state:".length)
      : !ctx.currentItem && ctx.stateItem
        ? `${ctx.stateItem}:${ds.scope}`
        : null;
  const isStateScope = !!stateScopeKey;
  let itemTemplateHTML = "";
  if (
    ds &&
    (ds.stateInputs || ds.provider || isStateScope || nestedSlotScope) &&
    templateChildIds.length > 0
  ) {
    const prevItem = ctx.currentItem;
    try {
      ctx.currentItem = makeSlotProxy() as any;
      const rendered = ctx.renderChildren(templateChildIds);
      ctx.currentItem = prevItem;
      // Stamp `data-item-id="{{slot:id}}"` on the first tag so the runtime
      // can reconcile by id when items change.
      itemTemplateHTML = stampItemId(rendered, "{{slot:id}}");
      // Nested inside a parent's template: escape this level's slots one
      // `^` deeper so filling the parent row leaves them for this repeater.
      if (nestedSlotScope) itemTemplateHTML = itemTemplateHTML.replace(/\{\{slot(\^*):/g, "{{slot^$1:");
    } finally {
      ctx.currentItem = prevItem;
    }
  }
  // Empty-state slot for a binding only the browser resolves: ship it so the
  // runtime can show it when the client fetch comes back with no rows.
  const emptyTemplateHTML =
    ds?.provider && ds.stateInputs && items === null && emptyChildIds.length > 0
      ? ctx.renderChildren(emptyChildIds)
      : "";
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
    ...(t === "form" ? {} : actionsAttr(props, ctx)),
    ...stateAttrs(props, ctx),
    action: t === "form" ? props.action || "" : undefined,
    method: t === "form" ? props.method || "POST" : undefined,
  };
  // Connector wiring for runtime refetch reconciler.
  if (ds?.provider) attrs["data-connector-id"] = ds.provider;
  if (bindingId) attrs["data-binding-key"] = bindingId;
  // SSR page totals for `publishStateKeys` (the load directive publishes them).
  if (bindingMeta) attrs["data-binding-meta"] = JSON.stringify(bindingMeta);
  // Plain-text collection name (not the hashed bindingId) so the runtime can
  // build the same `?collection=` fetch param the React path does.
  if (ds?.collection) attrs["data-binding-collection"] = ds.collection;
  if (ds?.stateInputs && Object.keys(ds.stateInputs).length > 0) {
    attrs["data-state-inputs"] = JSON.stringify(ds.stateInputs);
    // The binding's own query, sent under the state inputs on every refetch.
    const fetchOpts = clientFetchOptions(applyRouteParamsToDataSource(ds, ctx.routeParams ?? {}));
    if (Object.keys(fetchOpts).length > 0) attrs["data-fetch-opts"] = JSON.stringify(fetchOpts);
  }
  // State-scoped repeater (no connector fetch — iterate JSON-encoded array
  // sitting at `state:<key>`). Runtime directive subscribes + reconciles.
  if (stateScopeKey) {
    attrs["data-state-scope"] = stateScopeKey;
  }
  if (nestedSlotScope && ds?.scope) {
    attrs["data-scope-path"] = ds.scope.replace(/^item\./, "");
    if (ds.splitBy) attrs["data-scope-split"] = ds.splitBy;
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
  const finalChildren =
    childrenHTML +
    (itemTemplateHTML ? `<template data-item-template>${itemTemplateHTML}</template>` : "") +
    (emptyTemplateHTML ? `<template data-empty-template>${emptyTemplateHTML}</template>` : "");

  return tag(t, attrs, finalChildren);
};

/**
 * Splice a `data-item-id="..."` attribute into the first child tag of an
 * iteration's HTML. Per-item id lets the runtime reconciler match SSR
 * elements to refetched items on client navigation.
 *
 * Cheap regex match — children always start with `<tag` because they're
 * produced by `tag(...)` in component toHTMLs. If no match, return unchanged.
 */
function stampItemId(html: string, itemId: string, itemJson?: string): string {
  if (!html) return html;
  const json = itemJson ? ` data-item-json="${escapeAttr(itemJson)}"` : "";
  return html.replace(/^(\s*<[a-z][a-z0-9-]*)\b/i, (_m, open) => `${open} data-item-id="${itemId}"${json}`);
}

/**
 * Markup that resolves the full item in the runtime (see `readItemContext`):
 * add-to-cart, computed bindings, any action / modifier / attr still
 * carrying an unresolved `{{item.*}}` template (e.g. option chips' set-state),
 * and state modifiers gated on `item` conditions (a chip's `available`).
 * Mirrored in repeater.ts for client-rendered rows.
 */
const ITEM_CONTEXT_RE =
  /add-to-cart|data-computed-state-bindings|\{\{\s*item\.|data-state-modifiers="[^"]*&quot;type&quot;:&quot;item&quot;/;
