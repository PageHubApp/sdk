/**
 * Page management utilities — isolation, counting, ref resolution, variables
 */

import { ROOT_NODE } from "@craftjs/core";
import { phStorage } from "./phStorage";
import { decompressAsync } from "./compressionAsync";

/** Persisted when the editor canvas shows every page (not isolated to one). */
export const EDITOR_ALL_PAGES_STORAGE = "__all_pages__";

// ─── Page Count ───

export const getPageCount = (query: any) => {
  const root = query.node(ROOT_NODE).get();
  return !root
    ? []
    : root?.data?.nodes.filter((_: string) => query.node(_).get().data.props.type === "page") || [];
};

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

  if (select && _active) {
    setTimeout(() => {
      try {
        const node = query.node(_active).get();
        if (node) {
          // actions.selectNode(_active);
        }
      } catch (e) {
        console.error("Error selecting node:", e);
      }
    }, 100);
  }

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
 * Isolate a page with lazy loading support.
 * If the page is not in the CraftJS tree yet, fetches it via `fetchPage`,
 * merges it into the tree, then isolates.
 */
export async function isolatePageLazy(
  active: string | null,
  query: any,
  actions: any,
  setIsolate: (v: string) => void,
  fetchPage?: (pageNodeId: string) => Promise<{ content: string } | null>,
): Promise<void> {
  if (!active) {
    // Show all loaded pages
    isolatePageAlt(false, query, null, actions, setIsolate, false);
    return;
  }

  // Check if page is already loaded in the CraftJS tree
  try {
    const node = query.node(active).get();
    if (node) {
      // Page is loaded — just isolate
      isolatePageAlt(active, query, active, actions, setIsolate);
      return;
    }
  } catch {
    // Node not found — need to fetch
  }

  // Lazy load: fetch the page shard and merge into the tree
  if (!fetchPage) {
    console.warn(`[PageHub] Page ${active} not loaded and no fetchPage callback provided`);
    return;
  }

  const pageData = await fetchPage(active);
  if (!pageData?.content) {
    console.warn(`[PageHub] fetchPage(${active}) returned no content`);
    return;
  }

  // Decompress the fetched shard (shared + page)
  const json = await decompressAsync(pageData.content);
  const fetched = JSON.parse(json);

  // Get the current tree
  const currentJson = query.serialize();
  const current = JSON.parse(currentJson);

  // Merge: add the new page's nodes into the current tree
  // The fetched tree has ROOT + shared + one page. We only need the page subtree nodes.
  // Shared nodes (ROOT, header, footer) are already in the current tree.
  for (const [nodeId, node] of Object.entries(fetched)) {
    if (nodeId === "ROOT") {
      // Merge ROOT.nodes to include the new page
      const fetchedRootNodes = (node as any).nodes || [];
      const currentRootNodes = current.ROOT?.nodes || [];
      for (const id of fetchedRootNodes) {
        if (!currentRootNodes.includes(id)) {
          // Insert before footer (last shared child)
          const lastPageIdx = currentRootNodes.reduce((acc: number, nid: string, i: number) => {
            return current[nid]?.props?.type === "page" ? i : acc;
          }, -1);
          const insertAt = lastPageIdx >= 0 ? lastPageIdx + 1 : currentRootNodes.length;
          currentRootNodes.splice(insertAt, 0, id);
        }
      }
      continue;
    }
    // Skip shared nodes that already exist (header, footer, etc.)
    if (current[nodeId]) continue;
    // Add new page nodes
    current[nodeId] = node;
  }

  // Re-deserialize the merged tree
  actions.deserialize(JSON.stringify(current));
  _loadedPages.add(active);

  // Now isolate the newly loaded page
  // Small delay to let CraftJS process the deserialization
  requestAnimationFrame(() => {
    isolatePageAlt(active, query, active, actions, setIsolate);
  });
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
