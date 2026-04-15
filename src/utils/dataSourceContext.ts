/**
 * Data source context — walks the CraftJS node tree to find the nearest
 * ancestor Container with a `dataSource` prop.
 *
 * Used by the variable picker to show scoped fields (e.g. "Title" instead
 * of "connector.stripe.products.0.title") when editing inside a data-bound section.
 *
 * Field definitions are injected by the app at startup via registerConnectorFieldDefs().
 */

export interface DataSourceBinding {
  provider: string;
  collection: string;
  filter?: Record<string, string>;
  limit?: number;
  offset?: number;
  sort?: "newest" | "oldest" | "alpha" | "price_asc" | "price_desc";
  ids?: string[];
}

export interface ConnectorFieldDef {
  id: string;
  label: string;
}

interface ConnectorCollectionDef {
  key: string;
  label: string;
  description?: string;
  icon?: string;
  fields: ConnectorFieldDef[];
}

interface ConnectorProviderDef {
  label: string;
  collections: ConnectorCollectionDef[];
}

// ── Runtime registry (app injects field defs at startup) ────────────────

let _fieldDefs: Record<string, ConnectorProviderDef> = {};

/** App calls this at startup to register provider field metadata. */
export function registerConnectorFieldDefs(defs: Record<string, ConnectorProviderDef>) {
  _fieldDefs = defs;
}

/** Get all registered providers with their collections (for settings dropdowns). */
export function getRegisteredConnectorProviders(): Array<{
  key: string;
  label: string;
  collections: Array<{ key: string; label: string; description?: string; icon?: string }>;
}> {
  return Object.entries(_fieldDefs).map(([key, def]) => ({
    key,
    label: def.label,
    collections: def.collections.map(c => ({ key: c.key, label: c.label, description: c.description, icon: c.icon })),
  }));
}

/** Get field defs for a provider + collection. */
export function getConnectorFieldDefs(
  provider: string,
  collection: string
): ConnectorFieldDef[] | null {
  const p = _fieldDefs[provider];
  if (!p) return null;
  return p.collections.find(c => c.key === collection)?.fields ?? null;
}

/** Get the label for a provider. */
export function getConnectorProviderLabel(provider: string): string {
  return _fieldDefs[provider]?.label || provider;
}

/** Get the label for a collection. */
export function getConnectorCollectionLabel(provider: string, collection: string): string {
  const p = _fieldDefs[provider];
  return p?.collections.find(c => c.key === collection)?.label || collection;
}

/**
 * Walk up the node tree from `nodeId` to find the first ancestor with a `dataSource` prop.
 * Returns the dataSource binding or null if not inside a data-bound Container.
 */
export function findAncestorDataSource(
  nodeId: string,
  query: any
): DataSourceBinding | null {
  try {
    const node = query.node(nodeId).get();
    if (!node) return null;

    const ds = node.data.props?.dataSource;
    if (ds && ds.provider && ds.collection) {
      return {
        provider: ds.provider,
        collection: ds.collection,
        ...(ds.filter ? { filter: ds.filter } : {}),
      };
    }

    if (node.data.parent) {
      return findAncestorDataSource(node.data.parent, query);
    }
  } catch {
    // Query not ready or node doesn't exist
  }

  return null;
}
