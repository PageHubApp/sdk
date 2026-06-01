// ── Page settings load / commit ─────────────────────────────────────────────
//
// Wraps `useSettingsController` with the page-settings load/commit semantics.
// The in-tree (CraftJS, sync) vs. remote-shard (host callback, async) branch is
// load-bearing — `getLoadedPages().has(pageId)` decides the read path and the
// draft `_remote` flag drives the symmetric commit path. The 404-uniqueness
// sweep and the canvas-chrome mirror in `commitDraft` are preserved verbatim.

import type { MutableRefObject } from "react";
import { ROOT_NODE } from "@craftjs/utils";
import { getLoadedPages } from "../../../../utils/page/pageManagement";
import { sdkLog } from "../../../../utils/logger";
import { useSettingsController } from "../settings/useSettingsController";
import { type SettingsTabDefinition } from "../settings/types";
import {
  createDraftFromProps,
  createEmptyPageDraft,
  draftToPayload,
  getDraftSignature,
} from "./draft";
import { writeSettingsProps } from "./fields";
import type { PageSettingsDraft, PageSettingsTabContext } from "./types";

interface UsePageSettingsPersistenceParams {
  isOpen: boolean;
  pageId: string | null;
  allowCustom404Page: boolean;
  query: any;
  actions: any;
  queryRef: MutableRefObject<any>;
  configRef: MutableRefObject<any>;
  /** Merged built-in + injected tabs — their `onSave` hooks fan out during commit. */
  allTabs: Array<SettingsTabDefinition<PageSettingsDraft, PageSettingsTabContext>>;
  applySlugDefaults: (nextDraft: PageSettingsDraft) => void;
}

export function usePageSettingsPersistence({
  isOpen,
  pageId,
  allowCustom404Page,
  query,
  actions,
  queryRef,
  configRef,
  allTabs,
  applySlugDefaults,
}: UsePageSettingsPersistenceParams) {
  return useSettingsController<PageSettingsDraft>({
    isOpen,
    loadDraft: (): PageSettingsDraft | Promise<PageSettingsDraft> => {
      if (!pageId) return createEmptyPageDraft();

      // Page is in the CraftJS tree — read directly (sync)
      if (getLoadedPages().has(pageId)) {
        const node = queryRef.current.node(pageId).get();
        const props = node?.data?.props || {};
        const custom = node?.data?.custom || {};
        const nextDraft = createDraftFromProps(
          custom.displayName,
          props.isHomePage,
          props.is404Page,
          props,
          allowCustom404Page,
          false
        );
        applySlugDefaults(nextDraft);
        return nextDraft;
      }

      // Page is NOT in the tree — fetch from host via callback (async)
      const { fetchPageSettings } = configRef.current.callbacks;
      if (fetchPageSettings) {
        return fetchPageSettings(pageId).then((remote: any) => {
          if (remote) {
            const nextDraft = createDraftFromProps(
              remote.displayName,
              remote.isHomePage,
              remote.is404Page,
              remote.props || {},
              allowCustom404Page,
              true
            );
            applySlugDefaults(nextDraft);
            return nextDraft;
          }
          return createEmptyPageDraft();
        });
      }

      return createEmptyPageDraft();
    },
    getDraftSignature,
    commitDraft: (snapshot): void | Promise<void> => {
      if (!pageId) return;

      // Remote page — save via host callback (async)
      if (snapshot._remote) {
        const { savePageSettings } = configRef.current.callbacks;
        if (savePageSettings) {
          return savePageSettings(pageId, draftToPayload(snapshot, allowCustom404Page));
        }
        return;
      }

      // In-tree page — write to CraftJS (sync)
      try {
        const effective404 = allowCustom404Page && snapshot.is404Page;

        if (effective404) {
          const root = query.node(ROOT_NODE).get();
          for (const id of root?.data?.nodes || []) {
            if (id === pageId) continue;
            const child = query.node(id).get();
            if (child?.data?.props?.type === "page" && child?.data?.props?.is404Page) {
              actions.setProp(id, (p: any) => {
                p.is404Page = false;
              });
            }
          }
        }

        actions.setCustom(pageId, (custom: any) => {
          custom.displayName = snapshot.pageName;
        });

        actions.setProp(pageId, (p: any) => {
          p.isHomePage = snapshot.isHomePage;
          p.is404Page = effective404;
          writeSettingsProps(p, snapshot);

          for (const tab of allTabs) {
            tab.onSave?.({
              query,
              actions,
              draft: snapshot,
              pageId,
              allowCustom404Page,
              setProp: cb => cb(p),
            });
          }
        });

        // Mirror chrome suppression in the canvas — toggle every non-page
        // ROOT sibling based on the active page's flags. Skipped when
        // viewing "all pages" (no isolation), since chrome stays visible
        // there.
        try {
          const root = query.node(ROOT_NODE).get();
          const hideChrome = !!snapshot.hideChrome;
          for (const id of root?.data?.nodes || []) {
            const child = query.node(id).get();
            const t = child?.data?.props?.type;
            if (t === "page") continue;
            if (hideChrome) actions.setHidden(id, true);
            else if (t === "header") actions.setHidden(id, !!snapshot.hideHeader);
            else if (t === "footer") actions.setHidden(id, !!snapshot.hideFooter);
            else actions.setHidden(id, false);
          }
        } catch {
          /* ignore — best-effort canvas mirror */
        }
      } catch (e) {
        sdkLog.error("Error saving page settings:", e);
      }
    },
    debounceMs: 350,
    reloadKey: pageId,
  });
}
