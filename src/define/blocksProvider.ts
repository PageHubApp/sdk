/**
 * Blocks provider — host-injected source for the Blocks panel catalog.
 *
 * The Blocks panel (toolbox "Blocks" tab) renders categories + searchable
 * block templates that can be dragged onto the canvas. Historically the SDK
 * fetched these directly from `/api/v1/components*` against the host origin,
 * which only worked when the host was PageHub's own app. Standalone consumers
 * had no override point.
 *
 * Now the SDK consults a registered `BlocksProvider`. Hosts ship whatever
 * backing store they want — REST API, static JSON, in-memory fixture.
 *
 * Default: a HTTP provider that hits `/api/v1/components*` (the PageHub
 * cloud API) and LZ-decompresses the returned structures. PageHub's own app
 * works with zero registration. Standalone hosts call
 * `registerBlocksProvider(...)` with their own implementation before
 * enabling `features.blocksPanel.enabled`.
 *
 * See docs/sdk/host-constraints.md for usage.
 */

import { BlocksProviderError } from "../utils/errors";
import { tryDecompressBase64LzToJson } from "../utils/lz";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface BlockSubcategory {
  name: string;
  count: number;
}

export interface BlockCategory {
  id: string;
  name: string;
  total: number;
  subcategories: BlockSubcategory[];
  styles: BlockSubcategory[];
}

export interface BlockItem {
  _id: string;
  slug: string;
  name: string;
  category: string;
  subcategory?: string;
  styles?: string[];
  description?: string;
  /** Structure can be a CraftJS-shaped object or a string the SDK will JSON-parse. */
  structure: any;
  modifiers?: Record<string, { name: string; classes: string }[]>;
}

export interface BlocksProviderQuery {
  /** Restrict to a category (matches `BlockCategory.id`). */
  category?: string;
  /** Restrict to a subcategory within the category. */
  subcategory?: string;
  /** Restrict to blocks tagged with the given style. */
  style?: string;
  /** Full-text search across name / description / etc. */
  search?: string;
  /** Cap the result set. Default is provider-defined; the SDK passes 100 or 30. */
  limit?: number;
  /** Sort key the provider understands ("name", etc.). */
  sort?: string;
  /** When false, providers may return blocks with `structure: undefined` for faster list views.
   *  Defaults to true — the SDK needs structure for drag-to-canvas. */
  includeStructure?: boolean;
}

export interface BlocksProvider {
  /** Return the category catalog (no block structures). Called once per editor mount. */
  listCategories(): Promise<BlockCategory[]>;
  /** Return blocks matching the query. Structure should be a resolved JSON object. */
  listBlocks(query: BlocksProviderQuery): Promise<BlockItem[]>;
}

// ─── Registry ──────────────────────────────────────────────────────────────

let registered: BlocksProvider | null = null;

export function registerBlocksProvider(provider: BlocksProvider): void {
  if (!provider || typeof provider.listCategories !== "function" || typeof provider.listBlocks !== "function") {
    throw new BlocksProviderError({
      code: "BLOCKS_PROVIDER_INVALID",
      message: `[PageHub] registerBlocksProvider: provider must implement { listCategories, listBlocks }`,
      hint: "Both methods must be functions returning Promises. See docs/sdk/host-constraints.md.",
    });
  }
  registered = provider;
}

export function resetBlocksProvider(): void {
  registered = null;
}

/** Returns the registered provider, or the default HTTP provider when none is set. */
export function getBlocksProvider(): BlocksProvider {
  return registered ?? defaultHttpProvider;
}

// ─── Default HTTP provider ─────────────────────────────────────────────────
//
// PageHub cloud + any host that exposes the same `/api/v1/components*`
// endpoints work with zero registration. LZ-base64 structure strings are
// pre-decompressed before they reach the toolbox so consumers see plain
// nested-tree JSON.

function decompressStructure(component: any): any {
  if (!component) return component;
  if (typeof component.structure !== "string") return component;
  const decoded = tryDecompressBase64LzToJson(component.structure);
  return decoded ? { ...component, structure: decoded } : component;
}

function buildBlocksUrl(q: BlocksProviderQuery): string {
  const params = new URLSearchParams();
  if (q.category) params.set("category", q.category);
  if (q.subcategory) params.set("subcategory", q.subcategory);
  if (q.style) params.set("style", q.style);
  if (q.search) params.set("q", q.search);
  if (q.includeStructure !== false) params.set("include", "structure");
  if (q.limit != null) params.set("limit", String(q.limit));
  if (q.sort) params.set("sort", q.sort);
  return `/api/v1/components?${params.toString()}`;
}

export const defaultHttpProvider: BlocksProvider = {
  async listCategories() {
    const res = await fetch("/api/v1/components/categories");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.categories) ? (data.categories as BlockCategory[]) : [];
  },
  async listBlocks(query) {
    const res = await fetch(buildBlocksUrl(query));
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.components)) return [];
    return data.components.map(decompressStructure) as BlockItem[];
  },
};
