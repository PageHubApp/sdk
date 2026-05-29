import { useInWalker } from "../runtimeMode";
import React, { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { getClientDataFetcher, getConnectorData } from "../design/variables";
import { ItemProvider, useItemContext } from "../itemContext";
import { getStateValue, setState, subscribe as subscribeState } from "../state/stateRegistry";
import { getBindingMeta } from "../design/variables";
import { useAnchors, resolveAnchors } from "../anchors/anchorContext";
import { resolveNestedItems } from "./resolveNestedItems";
import { applyRouteParamsToDataSource } from "./routeParamsDataSource";
import { useRouteParams } from "../RouteParamsContext";
import { dataSourceBindingId } from "./storefrontDataSource";
import { sdkLog } from "../logger";

/**
 * Bind a node to an external data source: Stripe products, customer orders,
 * nested item arrays, etc. Used by the `Data` CraftJS component.
 */
export interface DataSource {
  provider: string;
  collection: string;
  filter?: Record<string, string>;
  ids?: string[];
  sort?: "newest" | "oldest" | "alpha" | "price_asc" | "price_desc";
  offset?: number;
  limit?: number;
  /** Nested repeater: path into parent item (e.g. item.images, item.metadata.sizes). */
  scope?: string;
  /** When scope resolves to a comma-separated string, split for iteration. */
  splitBy?: string;
  /** Skip merging visitor URL query into this binding (SSR/fetch). */
  ignoreUrl?: boolean;
  /**
   * Subscribe to specific state keys at fetch time. When any subscribed key
   * changes, the connector refetches with the current snapshot merged into
   * the request.
   *
   * Map shape: `{ <fetchOption>: <stateKey> }` — anchor tokens supported in
   * the value side, e.g. `{ category: "url:category", page: "url:page" }`.
   */
  stateInputs?: Record<string, string>;
  /**
   * After each fetch resolves, write result metadata to the named state keys
   * so pagination / "showing N of M" text can interpolate via
   * `{{state.<key>}}` or gate visibility via `state` conditions.
   */
  publishStateKeys?: {
    totalPages?: string;
    totalCount?: string;
    page?: string;
    count?: string;
  };
  /** Optional stable label for variable paths; included in binding id. */
  bindingKey?: string;
}

function applyDataSourceScope(
  items: any[] | null | undefined,
  ds: {
    collection?: string;
    filter?: Record<string, string>;
    ids?: string[];
    sort?: string;
    offset?: number;
    limit?: number;
  }
): any[] | null {
  if (!Array.isArray(items)) return null;
  let result = items;
  if (ds.ids?.length) {
    const idSet = new Set(ds.ids);
    result = result.filter(it => idSet.has(it?.id));
  }
  // Aggregated collections (facets, categories) carry their filter as a
  // server-side narrowing instruction — the returned rows don't carry the
  // product metadata being filtered on, so a client post-filter would drop
  // every row. Products is the only collection where `filter` maps onto the
  // item's metadata shape.
  const isProductItemCollection =
    !ds.collection || ds.collection === "products" || ds.collection === "product";
  if (isProductItemCollection && ds.filter && Object.keys(ds.filter).length > 0) {
    // Skip keys with empty string values — these come from unresolved
    // `{{params.x}}` placeholders on routes without that segment (e.g.
    // `/shop` vs `/shop/tees`). The server-side pipeline drops them too;
    // keeping behavior symmetric so client-side post-filter doesn't gut
    // a correctly-fetched page.
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

export interface DataBehavior {
  /** Wrap children for repeater rendering. Called from the container render hook. */
  renderChildren: (children: React.ReactNode) => React.ReactNode;
}

/**
 * Resolve a DataSource → items and return a render strategy for wrapping
 * children. The caller (typically `Data`) composes this with the container
 * render hook to get the final DOM output.
 */
export function useDataSource(
  ds: DataSource | undefined,
  props: { livePreview?: boolean; enabled?: boolean } = {}
): DataBehavior {
  // Walker always passes `enabled: false`; editor passes its Craft enabled.
  // When the caller doesn't supply, infer from the walker context (false) —
  // never call useEditor() here, otherwise the body would pull `@craftjs/core`
  // into the viewer bundle.
  const inWalker = useInWalker();
  const enabled = props.enabled ?? (inWalker ? false : true);
  const parentItem = useItemContext();
  const routeParams = useRouteParams();

  const connData = getConnectorData();
  const mergedDs = ds && !ds.scope ? applyRouteParamsToDataSource(ds, routeParams) : null;
  const bindingId = mergedDs ? dataSourceBindingId(mergedDs) : null;

  // `scope: "state:<key>"` — subscribe so writes from custom JS handlers
  // (`window.__phSetData`) or `set-state` actions rerender the repeater.
  const stateScopedKey =
    ds?.scope && ds.scope.startsWith("state:") ? ds.scope.slice("state:".length) : null;
  useSyncExternalStore(
    cb => (stateScopedKey ? subscribeState(stateScopedKey, cb) : () => {}),
    () => (stateScopedKey ? (getStateValue(stateScopedKey) ?? "") : ""),
    () => (stateScopedKey ? (getStateValue(stateScopedKey) ?? "") : "")
  );

  // `scope` → nested repeater: read from parent item OR state, split if needed.
  // Otherwise → top-level repeater: read from connectorData[provider].bindings[id].
  const rawItems: any[] | null = ds
    ? ds.scope
      ? resolveNestedItems(parentItem, ds.scope, ds.splitBy, getStateValue)
      : bindingId
        ? (connData?.[ds.provider]?.bindings?.[bindingId] ?? null)
        : null
    : null;
  const items = ds ? applyDataSourceScope(rawItems, mergedDs ?? ds) : rawItems;
  const hasItems = Array.isArray(items) && items.length > 0;

  // ── Client-side data source ──────────────────────────────────────────────
  const [clientItems, setClientItems] = useState<any[] | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const anchors = useAnchors();

  // Subscribe to state changes for refetch — but only the keys this binding
  // actually reads. Typing in a search input would otherwise refetch every
  // unrelated grid on the page (global-tick fan-out). We resolve every
  // `stateInputs` value (anchor-resolved) into a concrete state key, then
  // build a snapshot string of `key=value` pairs. `useSyncExternalStore`
  // re-runs the snapshot on every notify and React rerenders this component
  // only when the snapshot string changes — so `cart:open` toggles, unrelated
  // search keystrokes, etc. don't bump it.
  const subscribedKeys = useMemo(() => {
    if (!ds?.stateInputs) return [] as string[];
    return Object.values(ds.stateInputs)
      .filter((v): v is string => typeof v === "string")
      .map(raw => resolveAnchors(raw, anchors) || raw);
    // anchors map identity is stable per-page; stateInputs change on author edits.
  }, [ds?.stateInputs, anchors]);

  const stateInputsSnapshot = useSyncExternalStore(
    cb => {
      if (subscribedKeys.length === 0) return () => {};
      const offs = subscribedKeys.map(k => subscribeState(k, cb));
      return () => offs.forEach(off => off());
    },
    () => subscribedKeys.map(k => `${k}=${getStateValue(k) ?? ""}`).join("|"),
    () => subscribedKeys.map(k => `${k}=${getStateValue(k) ?? ""}`).join("|")
  );

  useEffect(() => {
    if (!ds?.stateInputs) return;
    setRefetchKey(k => k + 1);
  }, [stateInputsSnapshot, ds?.stateInputs]);

  useEffect(() => {
    if (!ds || enabled) return;
    if (ds.scope) return;
    const fetcher = getClientDataFetcher();
    if (!fetcher) return;
    // Initial mount fetch runs for any connector ds whenever SSR didn't
    // produce items (customer/me, customer/orders, or anything that can't be
    // fetched on the server). The `hasItems` guard below skips redundant
    // fetches when SSR DID hydrate.

    // Single client-side options pipe — declarative `stateInputs` map keys
    // from the registry (typically `url:*` populated by urlQueryStateBridge,
    // but any state key works) into fetch-option fields. No URL parsing,
    // no parallel storefront URL merge.
    let options: Record<string, any> | undefined;
    if (ds.stateInputs && typeof ds.stateInputs === "object") {
      options = {};
      for (const [optKey, rawStateKey] of Object.entries(ds.stateInputs)) {
        if (typeof rawStateKey !== "string") continue;
        const stateKey = resolveAnchors(rawStateKey, anchors) || rawStateKey;
        const v = getStateValue(stateKey);
        if (v == null || v === "") continue;
        options[optKey] = v;
      }
    }

    // Skip fetch when SSR already supplied items AND no state override is
    // active (initial-mount only — refetchKey > 0 means a state input
    // changed and we should re-run).
    const hasQueryOverride = options && Object.keys(options).length > 0;
    if (hasItems && !hasQueryOverride && refetchKey === 0) return;

    // Clear stale clientItems so the fetch window falls back to fresh SSR
    // items (new connectorData from soft-nav) instead of showing the PREVIOUS
    // URL's items re-filtered through the NEW filter — which evaluates to an
    // empty array and produces a visible flash of the no-products state.
    setClientItems(null);

    let cancelled = false;
    fetcher(ds.provider, ds.collection, options)
      .then(result => {
        if (cancelled || !Array.isArray(result)) return;
        setClientItems(result);
        // Publish per-fetch meta to state for pagination text + gating.
        const pub = ds.publishStateKeys;
        if (pub) {
          const meta = bindingId ? getBindingMeta(ds.provider, bindingId) : null;
          const writes: Array<[string | undefined, string | number | undefined]> = [
            [pub.totalPages, meta?.totalPages],
            [pub.totalCount, meta?.totalCount],
            [pub.page, options?.page ?? 1],
            [pub.count, result.length],
          ];
          for (const [rawKey, value] of writes) {
            if (!rawKey || value == null) continue;
            const key = resolveAnchors(rawKey, anchors) || rawKey;
            const next = String(value);
            if (getStateValue(key) === next) continue;
            setState(key, { kind: "value", value: next, source: "runtime" }, "data-source");
          }
        }
      })
      .catch(err => sdkLog.error("[Data] Client data fetch failed:", err));

    return () => {
      cancelled = true;
    };
  }, [
    ds?.provider,
    ds?.collection,
    ds?.limit,
    JSON.stringify(ds?.filter ?? null),
    JSON.stringify(ds?.stateInputs ?? null),
    JSON.stringify(ds?.publishStateKeys ?? null),
    JSON.stringify(routeParams),
    enabled,
    hasItems,
    refetchKey,
  ]);

  const scopedClientItems =
    ds && clientItems ? applyDataSourceScope(clientItems, mergedDs ?? ds) : clientItems;
  // clientItems wins when present — fresher URL-driven fetch. Falls back to SSR.
  const resolvedItems = scopedClientItems != null ? scopedClientItems : items;
  const hasResolvedItems = Array.isArray(resolvedItems) && resolvedItems.length > 0;

  const serverFetchedEmpty = Array.isArray(items) && items.length === 0;
  // Past-last-page detection used to read `mergedDs.page` (set by the legacy
  // storefront URL merge). Now `url:page` lives in the registry; if it's
  // anything > 1, the connector is paged forward and the empty result means
  // "nothing on this page" (vs. "no products at all").
  const pageStateValue = getStateValue("url:page");
  const pastLastPage = pageStateValue ? parseInt(pageStateValue, 10) > 1 : false;

  const showLivePreview = props.livePreview !== false; // default on

  const renderChildren = (children: React.ReactNode): React.ReactNode => {
    if (!ds) return children;

    // Published: repeat children for each item.
    if (!enabled && hasResolvedItems && children) {
      return resolvedItems!.map((item: any, idx: number) => (
        <ItemProvider key={item.id || idx} item={item} index={idx}>
          {children}
        </ItemProvider>
      ));
    }

    // Connector-backed repeater with no items: render nothing only when we
    // know the fetch produced nothing (server returned an empty array, or
    // URL page is past the last page). For bindings that haven't fetched yet
    // (server `items` is `null`, client fetcher still pending), fall through
    // so the template card renders with `{{item.x || Fallback}}` literals —
    // this is how customer-profile / customer-orders show a skeleton before
    // client data lands, and how product templates preview in the editor.
    if (!enabled && !hasResolvedItems && (serverFetchedEmpty || pastLastPage)) {
      return null;
    }

    // Editor: show live data preview — template card with first item (editable),
    // plus read-only clones for remaining items (toggleable via props.livePreview).
    if (enabled && hasItems && children) {
      return (
        <>
          <ItemProvider item={items![0]} index={0}>
            {children}
          </ItemProvider>
          {showLivePreview &&
            items!.slice(1).map((item: any, idx: number) => (
              <div key={item.id || idx + 1} style={{ pointerEvents: "none" }} aria-hidden>
                <ItemProvider item={item} index={idx + 1}>
                  {children}
                </ItemProvider>
              </div>
            ))}
        </>
      );
    }

    return children;
  };

  return { renderChildren };
}
