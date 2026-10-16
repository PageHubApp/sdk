/**
 * The parts of a `Data` binding's query that both renderers share, kept free of
 * React so the static walker, the runtime and the viewer hook can all import it.
 *
 * - `applyDataSourceScope` — sort / filter / paginate rows after they come out
 *   of connectorData (SSR) or a client fetch.
 * - `clientFetchOptions` — the request a client refetch sends: the binding's
 *   own query plus the live state / facet inputs. Without the binding's query a
 *   refetch returns the unfiltered catalog, so a filtered list (one product
 *   collection, one `{{params.category}}`) shows every product the moment a
 *   visitor searches, filters or pages.
 */

import { applyCollectionFilter } from "./collectionFilter";

export interface ScopedDataSource {
  collection?: string;
  filter?: Record<string, string>;
  ids?: string[];
  sort?: string;
  offset?: number;
  limit?: number;
  facetKeys?: string;
}

export function applyDataSourceScope(
  items: any[] | null | undefined,
  ds: ScopedDataSource
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
  if (isProductItemCollection) result = applyCollectionFilter(result, ds.filter);
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

/**
 * Options for a client refetch of `ds` (route params already applied): the
 * binding's `filter` (string values only — what the server can match), `sort`,
 * `limit`, `offset` and `facetKeys`, with `live` (state inputs, facet picks) on
 * top so a visitor's choice wins over the authored default.
 */
export function clientFetchOptions(
  ds: ScopedDataSource,
  live: Record<string, any> = {}
): Record<string, any> {
  const out: Record<string, any> = {};
  if (ds.filter && typeof ds.filter === "object" && !Array.isArray(ds.filter)) {
    const filter: Record<string, string> = {};
    for (const [k, v] of Object.entries(ds.filter)) {
      if (k && typeof v === "string" && v !== "") filter[k] = v;
    }
    if (Object.keys(filter).length > 0) out.filter = filter;
  }
  if (typeof ds.sort === "string" && ds.sort) out.sort = ds.sort;
  if (typeof ds.limit === "number" && ds.limit > 0) out.limit = ds.limit;
  if (typeof ds.offset === "number" && ds.offset > 0) out.offset = ds.offset;
  if (typeof ds.facetKeys === "string" && ds.facetKeys) out.facetKeys = ds.facetKeys;
  for (const [k, v] of Object.entries(live)) {
    if (v != null && v !== "") out[k] = v;
  }
  return out;
}
