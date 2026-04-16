/**
 * Page management utilities — isolation, counting, ref resolution, variables
 */

import { ROOT_NODE } from "@craftjs/core";
import { phStorage } from "./phStorage";
import { decompressAsync } from "./compressionAsync";

/** Persisted when the editor canvas shows every page (not isolated to one). */
export const EDITOR_ALL_PAGES_STORAGE = "__all_pages__";

/** Returns true when the isolate value points to an actual page (not "show all"). */
export function hasPageIsolation(value: string | null | undefined): value is string {
  return !!value && value !== EDITOR_ALL_PAGES_STORAGE;
}


// ─── Page Count ───

export function listPageNodeIds(query: any): string[] {
  const root = query.node(ROOT_NODE).get();
  if (!root?.data?.nodes) return [];
  return root.data.nodes.filter((nodeId: string) => {
    const node = query.node(nodeId).get();
    return node?.data?.props?.type === "page";
  });
}

/** Home page id, or first page node under ROOT when none is marked home. */
export function getDefaultEditorPageId(query: any): string | null {
  const root = query.node(ROOT_NODE).get();
  if (!root?.data?.nodes) return null;
  const nodes: string[] = root.data.nodes;
  const explicit = nodes.find((nodeId: string) => {
    const node = query.node(nodeId).get();
    return node?.data?.props?.type === "page" && node?.data?.props?.isHomePage === true;
  });
  if (explicit) return explicit;
  const firstPage = nodes.find((nodeId: string) => {
    const node = query.node(nodeId).get();
    return node?.data?.props?.type === "page";
  });
  return firstPage ?? null;
}

// ─── Page Isolation ───

/**
 * Show only one page in the CraftJS tree by hiding all other page nodes.
 * Pass `pageId = null` to show all pages (un-isolate).
 *
 * This is the in-tree isolation path (all pages loaded in memory).
 * For per-page sharding (fetch + deserialize), use `isolatePageLazy`.
 */
export function isolatePageInTree(
  query: any,
  actions: any,
  pageId: string | null,
  setIsolate: (v: string) => void,
) {
  const root = query.node(ROOT_NODE).get();
  for (const nodeId of root.data.nodes) {
    const node = query.node(nodeId).get();
    if (!node || node.data?.props?.type !== "page") continue;
    actions.setHidden(nodeId, pageId != null && nodeId !== pageId);
  }

  const value = pageId ?? EDITOR_ALL_PAGES_STORAGE;
  setIsolate(value);
  phStorage.set("isolated", value);
}


// ─── Loaded Pages Tracking (for selective loading / per-page saves) ───

/** Track which page shards are currently loaded in the CraftJS tree. */
const _loadedPages = new Set<string>();

export function getLoadedPages(): ReadonlySet<string> {
  return _loadedPages;
}

export function markPageLoaded(pageNodeId: string): void {
  _loadedPages.add(pageNodeId);
}

export function clearLoadedPages(): void {
  _loadedPages.clear();
}

/**
 * Switch to a page. If the page is not in the CraftJS tree, fetches it
 * via `fetchPage` and replaces the tree (shared + new page only).
 * Old page nodes are evicted — only one page lives in the DOM/tree at a time.
 *
 * Returns true if a fetch was needed (caller can show/hide loading state).
 */
export async function isolatePageLazy(
  active: string | null,
  query: any,
  actions: any,
  setIsolate: (v: string) => void,
  fetchPage?: (pageNodeId: string) => Promise<{ content: string } | null>,
): Promise<boolean> {
  if (!active) {
    isolatePageInTree(query, actions, null, setIsolate);
    return false;
  }

  if (!fetchPage) {
    // No fetchPage = standalone SDK, all pages in tree — just isolate
    isolatePageInTree(query, actions, active, setIsolate);
    return false;
  }

  const pageData = await fetchPage(active);
  if (!pageData?.content) {
    console.warn(`[PageHub] fetchPage(${active}) returned no content`);
    return false;
  }

  try {
    const json = await decompressAsync(pageData.content);
    actions.deserialize(json);
    clearLoadedPages();
    _loadedPages.add(active);
    setIsolate(active);
    phStorage.set("isolated", active);
    return true;
  } catch (e) {
    console.error(`[PageHub] Failed to load page shard ${active}:`, e);
    return false;
  }
}

// ─── Page Ref Resolution ───

export const resolvePageRef = (url: string, query: any, currentPath?: string): string => {
  if (!url || typeof url !== "string" || !url.startsWith("ref:")) return url;
  if (!query) return "#";

  try {
    const pageId = url.replace("ref:", "");
    const pageNode = query.node(pageId).get();
    if (!pageNode || pageNode.data?.props?.type !== "page") return "#";

    const isHomePage = pageNode.data?.props?.isHomePage;
    const displayName = pageNode.data?.custom?.displayName || "Untitled";

    let baseUrl = "";
    if (currentPath) {
      // asPath includes ?query and #hash — do not bake them into baseUrl or /slug appends to ?ref=...
      const pathOnly = currentPath.split(/[?#]/)[0];
      const pathParts = pathOnly.split("/").filter((p: string) => p && !p.startsWith("?"));
      if (pathParts.length >= 2 && (pathParts[0] === "build" || pathParts[0] === "view")) {
        baseUrl = `/${pathParts[0]}/${pathParts[1]}`;
      }
    }

    if (isHomePage) {
      return baseUrl || "/";
    } else {
      const pageSlug = displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      return baseUrl ? `${baseUrl}/${pageSlug}` : `/${pageSlug}`;
    }
  } catch (e) {
    console.error("Error resolving page reference:", e);
    return "#";
  }
};

// ─── Template Variables ───
// Re-export from the canonical source — utils/design/variables.ts handles all
// variable types (company.*, year, item.*, connector.*, variables.*).
export { replaceVariables } from "../utils/design/variables";
