import sluggit from "slug";
import { ROOT_NODE } from "@craftjs/utils";
import { useCallback, useEffect, useRef } from "react";
import {
  EDITOR_ALL_PAGES_STORAGE,
  getDefaultEditorPageId,
  isolatePageInTree,
  isolatePageLazy,
  listPageNodeIds,
} from "../../../../utils/page/pageManagement";
import { initPageNavigation, updateOnIsolate } from "../../../../utils/page/pageNavigation";
import { phStorage } from "../../../../utils/phStorage";

interface UseInitialPageNavigationArgs {
  query: any;
  actions: any;
  editorPageIdsKey: string;
  isolate: string;
  setIsolate: (next: string) => void;
  config: any;
  setPageLoad: (next: "idle" | "loading" | "done") => void;
}

/**
 * Bootstraps the page navigation store with the URL strategy + slug→pageId
 * resolver + onIsolate callback, then isolates the initial page (URL >
 * localStorage > home page). Re-binds the `onIsolate` callback whenever it
 * changes to avoid stale closures inside the nav store.
 */
export function useInitialPageNavigation({
  query,
  actions,
  editorPageIdsKey,
  isolate,
  setIsolate,
  config,
  setPageLoad,
}: UseInitialPageNavigationArgs) {
  const navInitRef = useRef(false);

  // Isolation callback — called by the nav store when a page switch is requested
  const onIsolate = useCallback(
    async (pageId: string | null) => {
      if (config.callbacks.fetchPage) {
        setPageLoad("loading");
        const fetched = await isolatePageLazy(
          pageId,
          query,
          actions,
          setIsolate,
          config.callbacks.fetchPage
        );
        setPageLoad(fetched ? "done" : "idle");
        return;
      }
      isolatePageInTree(query, actions, pageId, setIsolate);
    },
    [config.callbacks.fetchPage, query, actions, setIsolate, setPageLoad]
  );

  // Keep the nav store's callback fresh (avoids stale closures)
  useEffect(() => {
    if (navInitRef.current) updateOnIsolate(onIsolate);
  }, [onIsolate]);

  useEffect(() => {
    if (navInitRef.current) return;
    const root = query.node(ROOT_NODE).get();
    if (!root) return;
    const pageIds = listPageNodeIds(query);
    if (pageIds.length === 0) return;

    navInitRef.current = true;

    // Check localStorage for a previously isolated page
    const rawStored = phStorage.get("isolated");
    if (rawStored === EDITOR_ALL_PAGES_STORAGE) {
      phStorage.remove("isolated");
    }
    const storedId =
      rawStored && rawStored !== "null" && pageIds.includes(rawStored) ? rawStored : null;

    const initialPageId = initPageNavigation({
      urlStrategy: config.urlStrategy || null,
      resolvePageIdFromSlug: (slug: string) => {
        const r = query.node(ROOT_NODE).get();
        if (!r?.data?.nodes) return null;
        return (
          r.data.nodes.find((nodeId: string) => {
            const node = query.node(nodeId).get();
            if (node?.data?.props?.type === "page") {
              const customSlug = node.data.props?.pageSlug;
              return (customSlug || sluggit(node.data.custom?.displayName, "-")) === slug;
            }
            return false;
          }) || null
        );
      },
      getHomePageId: () => getDefaultEditorPageId(query),
      onIsolate,
    });

    // Prefer: URL page > localStorage page > nav store's pick (home page).
    // Initial page is already in the tree from SSR — just isolate, don't fetch.
    const targetPage = initialPageId || storedId || getDefaultEditorPageId(query);
    if (targetPage && targetPage !== isolate) {
      // Defer to next tick so CraftJS tree is fully mounted before hiding pages
      setTimeout(() => {
        isolatePageInTree(query, actions, targetPage, setIsolate);
      }, 0);
    }
  }, [editorPageIdsKey, query, actions, setIsolate, isolate, config.urlStrategy, onIsolate]);
}
