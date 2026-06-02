/**
 * Page management utilities — isolation, counting, ref resolution, variables
 */

import { ROOT_NODE } from "../rootNode";
import { phStorage } from "../phStorage";
import { sdkLog } from "../logger";
// `decompressAsync` (lzutf8) is editor-only — `loadPage` dynamic-imports it
// at call time so viewer/walker bundles don't drag the compression lib in.

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
  setIsolate: (v: string) => void
) {
  const root = query.node(ROOT_NODE).get();
  let hideHeader = false;
  let hideFooter = false;
  let hideChrome = false;
  for (const nodeId of root.data.nodes) {
    const node = query.node(nodeId).get();
    if (!node || node.data?.props?.type !== "page") continue;
    const hidden = pageId != null && nodeId !== pageId;
    actions.setHidden(nodeId, hidden);
    if (pageId && nodeId === pageId) {
      hideHeader = node.data?.props?.hideHeader === true;
      hideFooter = node.data?.props?.hideFooter === true;
      hideChrome = node.data?.props?.hideChrome === true;
    }
  }
  // Mirror the walker's chrome-suppression. When `pageId` is null
  // (show all pages), all chrome stays visible.
  for (const nodeId of root.data.nodes) {
    const node = query.node(nodeId).get();
    const t = node?.data?.props?.type;
    if (t === "page") continue;
    if (pageId == null) {
      actions.setHidden(nodeId, false);
      continue;
    }
    if (hideChrome) actions.setHidden(nodeId, true);
    else if (t === "header") actions.setHidden(nodeId, hideHeader);
    else if (t === "footer") actions.setHidden(nodeId, hideFooter);
    else actions.setHidden(nodeId, false);
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
  fetchPage?: (pageNodeId: string) => Promise<{ content: string } | null>
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
    sdkLog.warn(`[PageHub] fetchPage(${active}) returned no content`);
    return false;
  }

  try {
    const { decompressAsync } = await import("../compressionAsync");
    const json = await decompressAsync(pageData.content);
    actions.history.ignore().deserialize(json);
    clearLoadedPages();
    _loadedPages.add(active);
    setIsolate(active);
    phStorage.set("isolated", active);
    return true;
  } catch (e) {
    sdkLog.error(`[PageHub] Failed to load page shard ${active}:`, e);
    return false;
  }
}

// ─── Page Ref Resolution ───

/**
 * Page index entry — produced either from the live Craft tree (editor) or
 * from `rootProps._pageIndex` injected by SSR for sharded single-page loads.
 */
export interface PageIndexEntry {
  isHomePage?: boolean;
  displayName: string;
}

export type PageIndex = Record<string, PageIndexEntry>;

/**
 * One-stop extractor for editor call sites — reads ROOT_NODE.data.props once
 * and pre-builds the page index. Replaces the query.node(ROOT_NODE) reads
 * scattered throughout components. Returns empty/null for missing root.
 *
 * Walker callers do NOT use this — they have rootProps + pageIndex directly.
 */
export interface ExtractedRootData {
  rootProps: Record<string, any>;
  pageMedia: any[] | null;
  pageIndex: PageIndex;
}

export function extractRootDataFromQuery(query: any): ExtractedRootData {
  const empty: ExtractedRootData = { rootProps: {}, pageMedia: null, pageIndex: {} };
  if (!query) return empty;
  try {
    const root = query.node(ROOT_NODE).get();
    const rootProps = root?.data?.props ?? {};
    return {
      rootProps,
      pageMedia: Array.isArray(rootProps.pageMedia) ? rootProps.pageMedia : null,
      pageIndex: buildPageIndexFromQuery(query),
    };
  } catch {
    return empty;
  }
}

/**
 * Build a PageIndex from a Craft query — editor call sites use this once
 * per render to feed `resolvePageRef`. Walker callers read
 * `rootProps._pageIndex` directly (already in PageIndex shape).
 */
export function buildPageIndexFromQuery(query: any): PageIndex {
  const out: PageIndex = {};
  if (!query) return out;
  try {
    const root = query.node(ROOT_NODE).get();
    const ssrIndex = root?.data?.props?._pageIndex;
    if (ssrIndex && typeof ssrIndex === "object") Object.assign(out, ssrIndex);
    const childIds: string[] = root?.data?.nodes ?? [];
    for (const id of childIds) {
      try {
        const n = query.node(id).get();
        if (n?.data?.props?.type === "page") {
          out[id] = {
            isHomePage: n.data.props.isHomePage,
            displayName: n.data.custom?.displayName || "Untitled",
          };
        }
      } catch {
        /* node missing — skip */
      }
    }
  } catch {
    /* root missing — return whatever we have */
  }
  return out;
}

export const resolvePageRef = (
  url: string,
  pageIndex: PageIndex | null | undefined,
  currentPath?: string
): string => {
  if (!url || typeof url !== "string" || !url.startsWith("ref:")) return url;
  if (!pageIndex) return "#";

  try {
    const pageId = url.replace("ref:", "");
    const entry = pageIndex[pageId];
    if (!entry) return "#";
    const isHomePage = entry.isHomePage;
    const displayName = entry.displayName || "Untitled";

    let baseUrl = "";
    if (currentPath) {
      // asPath includes ?query and #hash — do not bake them into baseUrl or /slug appends to ?ref=...
      const pathOnly = currentPath.split(/[?#]/)[0];
      const pathParts = pathOnly.split("/").filter((p: string) => p && !p.startsWith("?"));
      if (
        pathParts.length >= 2 &&
        (pathParts[0] === "build" || pathParts[0] === "view" || pathParts[0] === "static")
      ) {
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
    sdkLog.error("Error resolving page reference:", e);
    return "#";
  }
};

// ─── Template Variables ───
// Re-export from the canonical source — utils/design/variables.ts handles all
// variable types (company.*, year, item.*, connector.*, variables.*).
export { replaceVariables } from "../design/variables";
