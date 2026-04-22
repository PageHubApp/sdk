import { useEditor } from "@craftjs/core";
import React, { useEffect, useState } from "react";

import { getClientDataFetcher, getConnectorData } from "./design/variables";
import { ItemProvider, useItemContext } from "./itemContext";
import { PAGEHUB_URL_QUERY_CHANGED_EVENT } from "./pagehubEvents";
import { resolveNestedItems } from "./resolveNestedItems";
import { applyRouteParamsToDataSource } from "./routeParamsDataSource";
import { useRouteParams } from "./RouteParamsContext";
import {
  applyStorefrontUrlToDataSource,
  dataSourceBindingId,
  parseStorefrontUrlQuery,
} from "./storefrontDataSource";
import { useStorefrontUrlQuery } from "./StorefrontUrlQueryContext";

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
   * When true, subscribe to URL query changes and re-run the registered client
   * data fetcher (e.g. public connector endpoint). Omit or false for bindings that
   * should only use SSR/hydrated connector data.
   */
  refetchOnUrlChange?: boolean;
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
    const activeFilter = Object.entries(ds.filter).filter(
      ([, v]) => v != null && v !== ""
    );
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
  /** Extra DOM attrs (data-ph-connector-*). Merged onto the rendered element. */
  attrs?: Record<string, any>;
}

/**
 * Resolve a DataSource → items and return a render strategy for wrapping
 * children. The caller (typically `Data`) composes this with the container
 * render hook to get the final DOM output.
 */
export function useDataSource(
  ds: DataSource | undefined,
  props: { livePreview?: boolean } = {}
): DataBehavior {
  const { enabled } = useEditor(state => ({ enabled: state.options.enabled }));
  const parentItem = useItemContext();
  const routeParams = useRouteParams();
  const storefrontUrlQuery = useStorefrontUrlQuery();

  const connData = getConnectorData();
  const mergedDs =
    ds && !ds.scope
      ? applyStorefrontUrlToDataSource(
          applyRouteParamsToDataSource(ds, routeParams),
          storefrontUrlQuery
        )
      : null;
  const bindingId = mergedDs ? dataSourceBindingId(mergedDs) : null;
  // `scope` → nested repeater: read from parent item, split if needed.
  // Otherwise → top-level repeater: read from connectorData[provider].bindings[id].
  const rawItems: any[] | null = ds
    ? ds.scope
      ? resolveNestedItems(parentItem, ds.scope, ds.splitBy)
      : bindingId
        ? (connData?.[ds.provider]?.bindings?.[bindingId] ?? null)
        : null
    : null;
  const items = ds ? applyDataSourceScope(rawItems, mergedDs ?? ds) : rawItems;
  const hasItems = Array.isArray(items) && items.length > 0;

  // ── Client-side data source ──────────────────────────────────────────────
  const [clientItems, setClientItems] = useState<any[] | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  const wantsUrlClientRefetch = ds?.refetchOnUrlChange === true && !ds?.scope;

  useEffect(() => {
    if (!wantsUrlClientRefetch) return;
    const bump = () => setRefetchKey(k => k + 1);
    window.addEventListener(PAGEHUB_URL_QUERY_CHANGED_EVENT, bump);
    window.addEventListener("popstate", bump);
    return () => {
      window.removeEventListener(PAGEHUB_URL_QUERY_CHANGED_EVENT, bump);
      window.removeEventListener("popstate", bump);
    };
  }, [wantsUrlClientRefetch]);

  useEffect(() => {
    if (!ds || enabled) return;
    if (ds.scope) return;
    const fetcher = getClientDataFetcher();
    if (!fetcher) return;
    // `refetchOnUrlChange` only gates the URL-listener effect above. Initial
    // mount fetch runs for any connector ds whenever SSR didn't produce items
    // (customer/me, customer/orders, or anything that can't be fetched on the
    // server). The `hasItems` guard below skips redundant fetches when SSR
    // DID hydrate.

    // Read current URL params for client refetch (search/filter/pagination, etc.).
    let options: Record<string, any> | undefined;
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const flat: Record<string, string | string[] | undefined> = {};
      searchParams.forEach((v, k) => {
        flat[k] = v;
      });
      const urlQ = parseStorefrontUrlQuery(flat);
      const mergedForFetch = applyStorefrontUrlToDataSource(
        applyRouteParamsToDataSource(ds, routeParams),
        urlQ
      );
      options = {
        ...(mergedForFetch.query ? { q: mergedForFetch.query } : {}),
        ...(mergedForFetch.category ? { category: mergedForFetch.category } : {}),
        ...(mergedForFetch.sort ? { sort: mergedForFetch.sort } : {}),
        ...(typeof mergedForFetch.page === "number" ? { page: String(mergedForFetch.page) } : {}),
        ...(typeof mergedForFetch.priceMin === "number"
          ? { minPrice: String(mergedForFetch.priceMin) }
          : {}),
        ...(typeof mergedForFetch.priceMax === "number"
          ? { maxPrice: String(mergedForFetch.priceMax) }
          : {}),
        ...(mergedForFetch.filter ? { filter: mergedForFetch.filter } : {}),
        ...(typeof mergedForFetch.facetKeys === "string" && mergedForFetch.facetKeys
          ? { facetKeys: mergedForFetch.facetKeys }
          : {}),
        ...(mergedForFetch.limit ? { limit: mergedForFetch.limit } : {}),
      };
      // Flatten facet selections to `facet.<key>` entries so the public-data
      // endpoint picks them up via its `req.query["facet.*"]` scan. Matches
      // the URL shape the storefront hook writes on form submit.
      if (mergedForFetch.facetFilters && typeof mergedForFetch.facetFilters === "object") {
        for (const [k, v] of Object.entries(mergedForFetch.facetFilters)) {
          if (!Array.isArray(v) || v.length === 0) continue;
          options[`facet.${k}`] = v.join(",");
        }
      }
    }

    // Only skip when we have SSR items AND no user-driven URL query overriding them.
    const hasQueryOverride =
      options &&
      (options.q ||
        options.category ||
        options.page ||
        options.minPrice ||
        options.maxPrice ||
        options.sort ||
        (options.filter && Object.keys(options.filter).length > 0));
    if (hasItems && !hasQueryOverride && refetchKey === 0) return;

    // Clear stale clientItems so the fetch window falls back to fresh SSR
    // items (new connectorData from soft-nav) instead of showing the PREVIOUS
    // URL's items re-filtered through the NEW filter — which evaluates to an
    // empty array and produces a visible flash of the no-products state.
    setClientItems(null);

    let cancelled = false;
    fetcher(ds.provider, ds.collection, options)
      .then(result => {
        if (!cancelled && Array.isArray(result)) {
          setClientItems(result);
        }
      })
      .catch(err => console.error("[Data] Client data fetch failed:", err));

    return () => {
      cancelled = true;
    };
  }, [
    ds?.provider,
    ds?.collection,
    ds?.refetchOnUrlChange,
    ds?.limit,
    JSON.stringify(ds?.filter ?? null),
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
  const pastLastPage = (mergedDs?.page ?? 1) > 1;

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

  const attrs: Record<string, any> | undefined =
    ds && bindingId && !ds.scope
      ? {
          "data-ph-connector-provider": ds.provider,
          "data-ph-connector-binding-id": bindingId,
          "data-ph-connector-count": String(
            Array.isArray(resolvedItems) ? resolvedItems.length : 0
          ),
          ...(typeof mergedDs?.page === "number"
            ? { "data-ph-connector-page": String(mergedDs.page) }
            : {}),
        }
      : undefined;

  return { renderChildren, attrs };
}
