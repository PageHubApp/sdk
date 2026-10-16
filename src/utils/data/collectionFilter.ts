/**
 * The one `dataSource.filter` matcher, shared by the server query fallback
 * (app `applyItemQuery`), the static walker (`Data.toHTML`) and the client
 * post-filter (`useDataSource`), so a filter narrows the same rows everywhere.
 *
 * Empty values (an unresolved `{{params.x}}` on a route without that segment)
 * are skipped so they don't narrow to nothing. Each field matches against the
 * item, falling back to `metadata.<key>`: an ARRAY field (a product's `tags`,
 * `categories`) uses a membership test; a scalar (`slug`) uses equality. Both
 * compare as strings, like Mongo's match on the denormalized `q` columns.
 */
export function applyCollectionFilter<T extends Record<string, any>>(
  items: T[],
  filter: Record<string, unknown> | undefined
): T[] {
  if (!filter || typeof filter !== "object") return items;
  const active = Object.entries(filter).filter(([, v]) => v != null && v !== "");
  if (!active.length) return items;
  return items.filter(it =>
    active.every(([k, v]) => {
      const iv = it?.[k] ?? it?.metadata?.[k];
      if (Array.isArray(iv)) return iv.some(x => String(x) === String(v));
      return String(iv ?? "") === String(v);
    })
  );
}
