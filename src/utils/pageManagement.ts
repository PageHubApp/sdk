/**
 * Page management utilities — isolation, counting, ref resolution, variables
 */

import { ROOT_NODE } from "@craftjs/core";
import { phStorage } from "./phStorage";
import { decompressAsync } from "./compressionAsync";

/** Persisted when the editor canvas shows every page (not isolated to one). */
export const EDITOR_ALL_PAGES_STORAGE = "__all_pages__";

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

export const isolatePageAlt = (
  _isolate: string | boolean,
  query: any,
  active: any,
  actions: any,
  setIsolate: (v: string) => void,
  select = true
) => {
  const root = query.node(ROOT_NODE).get();
  const _active = active ? active.valueOf() : null;

  root.data.nodes
    .map((_: string) => {
      const _props = query.node(_).get();
      if (!_props || _props?.data?.props?.type !== "page") return _;
      actions.setHidden(_, !!active);
      actions.setProp(_, (prop: any) => (prop.hidden = !!active));
      return _;
    })
    .filter((_: string) => _ === _active)
    .forEach((_: string) => {
      const _props = query.node(_).get();
      if (!_props || _props?.data?.props?.type !== "page") return;
      actions.setHidden(_, false);
      actions.setProp(_, (prop: any) => (prop.hidden = false));
    });

  setIsolate(active == null ? "" : active);
  if (active == null) {
    phStorage.set("isolated", EDITOR_ALL_PAGES_STORAGE);
  } else {
    phStorage.set("isolated", active);
  }
};

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
    isolatePageAlt(false, query, null, actions, setIsolate, false);
    return false;
  }

  // Page already in tree — just isolate (no fetch, no eviction)
  try {
    const node = query.node(active).get();
    if (node) {
      isolatePageAlt(active, query, active, actions, setIsolate);
      return false;
    }
  } catch {
    // Node not found — need to fetch
  }

  if (!fetchPage) {
    console.warn(`[PageHub] Page ${active} not loaded and no fetchPage callback provided`);
    return false;
  }

  const pageData = await fetchPage(active);
  if (!pageData?.content) {
    console.warn(`[PageHub] fetchPage(${active}) returned no content`);
    return false;
  }

  // Replace the entire tree with shared + new page.
  // Old page nodes are evicted — keeps memory and DOM lean.
  try {
    const json = await decompressAsync(pageData.content);

    // Hide the entire viewport scroll container during swap to prevent flash.
    // opacity:0 is composited (no reflow) and hides everything including
    // React's intermediate renders during deserialize.
    const viewport = document.getElementById("viewport");
    const scrollContainer = viewport?.closest("[class*='overflow']") as HTMLElement | null;
    const hideTarget = scrollContainer || viewport;
    if (hideTarget) hideTarget.style.opacity = "0";

    actions.deserialize(json);
    clearLoadedPages();
    _loadedPages.add(active);

    await new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        isolatePageAlt(active, query, active, actions, setIsolate);
        // Reset scroll
        if (scrollContainer) scrollContainer.scrollTop = 0;
        if (viewport) viewport.scrollTop = 0;
        // Wait for React + DOM paint, then reveal
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (hideTarget) hideTarget.style.opacity = "";
            resolve();
          });
        });
      });
    });
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

export const replaceVariables = (text: string, query: any): string => {
  if (!text || typeof text !== "string") return text || "";

  return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    const trimmed = varName.trim();
    try {
      if (trimmed.startsWith("company.")) {
        const field = trimmed.replace("company.", "");
        const root = query?.node(ROOT_NODE)?.get();
        if (root?.data?.props) {
          if (field === "name" && root.data.props.pageTitle) {
            return root.data.props.pageTitle;
          }
        }
      }
    } catch {
      // Silently fail
    }
    return match;
  });
};
