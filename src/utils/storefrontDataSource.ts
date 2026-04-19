/**
 * Storefront URL merge + stable binding ids for connector dataSource.
 * Shared by server fetch (fetchConnectorDataForPage) and client Container lookup.
 */

/** Parsed storefront query string (same shape as server parseStorefrontQuery). */
export interface StorefrontUrlQuery {
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
  minPrice?: number;
  maxPrice?: number;
}

const STOREFRONT_COLLECTIONS = new Set([
  "products",
  "products.categories",
  "product",
]);

/** Parse Next.js router / request query into StorefrontUrlQuery. */
export function storefrontQueryFromRouterQuery(
  query: Record<string, string | string[] | undefined> | undefined
): StorefrontUrlQuery {
  return parseStorefrontUrlQuery(query);
}

export function parseStorefrontUrlQuery(
  q: Record<string, string | string[] | undefined> | undefined
): StorefrontUrlQuery {
  if (!q) return {};
  const pick = (k: string) => {
    const v = q[k];
    return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
  };
  const num = (k: string) => {
    const v = pick(k);
    const n = v != null ? Number(v) : NaN;
    return Number.isFinite(n) ? n : undefined;
  };
  // Only set defined values — Next.js getServerSideProps JSON serialization rejects explicit `undefined`.
  const out: StorefrontUrlQuery = {};
  const qStr = pick("q")?.trim();
  if (qStr) out.q = qStr;
  const category = pick("category");
  if (category) out.category = category;
  const sort = pick("sort");
  if (sort) out.sort = sort;
  const page = num("page");
  if (page !== undefined) out.page = page;
  const minPrice = num("minPrice");
  if (minPrice !== undefined) out.minPrice = minPrice;
  const maxPrice = num("maxPrice");
  if (maxPrice !== undefined) out.maxPrice = maxPrice;
  return out;
}

/**
 * Merge storefront URL params into a dataSource for SSR / client resolution.
 */
export function applyStorefrontUrlToDataSource(ds: any, url: StorefrontUrlQuery): any {
  if (ds?.ignoreUrl) return ds;
  if (!STOREFRONT_COLLECTIONS.has(ds?.collection)) return ds;
  if (ds.collection === "products.categories") return ds;
  const merged = { ...ds };
  if (url.q && !merged.query) merged.query = url.q;
  if (url.category && !merged.category) merged.category = url.category;
  if (url.sort && !merged.sort) merged.sort = url.sort;
  if (typeof url.page === "number" && !merged.page) merged.page = url.page;
  if (typeof url.minPrice === "number" && merged.priceMin == null) merged.priceMin = url.minPrice;
  if (typeof url.maxPrice === "number" && merged.priceMax == null) merged.priceMax = url.maxPrice;
  return merged;
}

/** Canonical string (pre-hash) — must stay aligned with server dedupe. */
export function canonicalDataSourceKeyString(ds: any): string {
  const filterKey = ds.filter ? JSON.stringify(ds.filter, Object.keys(ds.filter).sort()) : "";
  const idsKey = ds.ids?.length ? ds.ids.sort().join(",") : "";
  const bindingKey = ds.bindingKey != null && ds.bindingKey !== "" ? String(ds.bindingKey) : "";
  return [
    ds.provider,
    ds.collection,
    filterKey,
    ds.limit || "",
    ds.offset || "",
    ds.sort || "",
    idsKey,
    ds.query || "",
    ds.category || "",
    ds.page || "",
    ds.cursor || "",
    ds.priceMin ?? "",
    ds.priceMax ?? "",
    ds.autoWalk ? "walk" : "",
    bindingKey,
  ].join(":");
}

function utf8ToBase64Url(s: string): string {
  if (typeof Buffer !== "undefined") {
    // Use "base64" + manual URL-safe transform — some runtimes reject Buffer "base64url".
    return Buffer.from(s, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Stable id for connector storage / lookup (URL-safe, no raw colons in path segments).
 */
export function dataSourceBindingId(ds: any): string {
  return utf8ToBase64Url(canonicalDataSourceKeyString(ds));
}

/**
 * Build a dataSource-shaped object from fetch target parts (server parallel to node merge).
 */
export function dataSourceFromFetchTarget(
  provider: string,
  collection: string,
  target: Record<string, any>
): any {
  return {
    provider,
    collection,
    ...(target.filter ? { filter: target.filter } : {}),
    ...(target.limit != null && target.limit !== "" ? { limit: target.limit } : {}),
    ...(target.offset != null && target.offset !== "" ? { offset: target.offset } : {}),
    ...(target.sort ? { sort: target.sort } : {}),
    ...(target.ids?.length ? { ids: target.ids } : {}),
    ...(target.query ? { query: target.query } : {}),
    ...(target.category ? { category: target.category } : {}),
    ...(typeof target.page === "number" ? { page: target.page } : {}),
    ...(target.cursor ? { cursor: target.cursor } : {}),
    ...(typeof target.priceMin === "number" ? { priceMin: target.priceMin } : {}),
    ...(typeof target.priceMax === "number" ? { priceMax: target.priceMax } : {}),
    ...(target.autoWalk ? { autoWalk: target.autoWalk } : {}),
    ...(target.maxPages != null ? { maxPages: target.maxPages } : {}),
    ...(target.bindingKey != null && target.bindingKey !== ""
      ? { bindingKey: target.bindingKey }
      : {}),
  };
}
