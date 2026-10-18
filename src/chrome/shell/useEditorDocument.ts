/**
 * The editor's document lifecycle: initial load through `callbacks.onLoad`,
 * the save coordinator, `_doLoad` / unsaved-change events, the debounced
 * `onChange`, and the registry backrefs (editor query/actions, mouse-region
 * tracker, overlay stack).
 *
 * Runs once per editor in `EditorServices`, never in the canvas, so placing,
 * moving or remounting the canvas can't reload the page or drop its save
 * wiring. The canvas reads `useEditorDocumentLoaded()` to swap the loader for
 * Craft's `<Frame />`.
 */
import { useEditor } from "@craftjs/core";
import { useAtomState, useEcosystem } from "@zedux/react";
import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { useSDK } from "../../core/context";
import { applyFetchedTree, safeSerialize } from "../../core/editorTree";
import { getSaveCoordinator } from "../../core/saveCoordinator";
import { useRegistries } from "../../registry";
import { clearEditorBackref, setEditorBackref } from "../../registry/editorBackref";
import { useRegisterOverlayContext } from "../../registry/hooks/useRegisterOverlayContext";
import { mountMouseOverTracker } from "../../registry/mouseOverTracker";
import type { PageData } from "../../types";
import { BatchOperationAtom, EditorSaveBannerAtom, useSetAtomState } from "../../utils/atoms";
import { compressAsync } from "../../utils/compressionAsync";
import { createValueStore, useValueStore, type ValueStore } from "../../utils/createValueStore";
import { sdkLog } from "../../utils/logger";
import { listPageNodeIds } from "../../utils/page/pageManagement";
import { extractPageShard, extractSharedShard } from "../../utils/treeSharding";
import { UnsavedChangesAtom } from "../viewport/state/atoms";

/** Whether the initial document load has finished; one store per editor mount. */
export const EditorDocumentLoadedContext = createContext<ValueStore<boolean> | null>(null);

const FALLBACK_LOADED = createValueStore(false);

/** True once the editor's initial `onLoad` has been applied (or failed). */
export function useEditorDocumentLoaded(): boolean {
  return useValueStore(useContext(EditorDocumentLoadedContext) ?? FALLBACK_LOADED);
}

export function useEditorDocument(onQueryReady?: (query: any) => void): void {
  const { config, emitter, readOnly } = useSDK();
  const { actions, query } = useEditor();
  const ecosystem = useEcosystem();
  const loadedStore = useContext(EditorDocumentLoadedContext) ?? FALLBACK_LOADED;
  const loaded = useValueStore(loadedStore);
  const setLoaded = loadedStore.set;
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const setBatchOperation = useSetAtomState(BatchOperationAtom);
  const setEditorSaveBanner = useSetAtomState(EditorSaveBannerAtom);

  // Expose the query ref to the parent
  useEffect(() => {
    if (onQueryReady) onQueryReady(query);
  }, [query, onQueryReady]);

  // Capture editor backrefs into the registry so command `run` bodies and
  // the keybinding dispatcher can reach CraftJS + Zedux without React.
  useEffect(() => {
    setEditorBackref({ query, actions, ecosystem });
    return () => {
      clearEditorBackref();
    };
  }, [query, actions, ecosystem]);

  // Mount the mouse-region tracker once after the editor DOM is in place.
  // Powers the `mouseOver` context key required by `ph.sidebar.search` (⌘F).
  // Uses mouseenter / mouseleave on labeled regions — no mousemove cost.
  const registries = useRegistries();
  useEffect(() => {
    // Defer to next tick so #viewport / #toolbar are in the DOM.
    let unmount = () => {};
    const raf = requestAnimationFrame(() => {
      unmount = mountMouseOverTracker({ context: registries.context });
    });
    return () => {
      cancelAnimationFrame(raf);
      unmount();
    };
  }, [registries.context]);

  // Wire the editor overlay stack into the command context so the Escape
  // priority chain (`ph.overlay.dismissTop`) sees real `stackDepth` /
  // `topId` values. Surfaces register via `useOverlay({ id, isOpen, ... })`.
  useRegisterOverlayContext();

  // Load initial data
  useEffect(() => {
    async function loadInitialData() {
      try {
        const pageData = await config.callbacks.onLoad(config.pageId);

        if (pageData?.content) {
          setBatchOperation(true);
          // SSR may have assembled only one page + shared shard —
          // unloaded pages will be fetched on demand via isolatePageLazy.
          await applyFetchedTree(pageData.content, query, actions);
          requestAnimationFrame(() => {
            setBatchOperation(false);
          });
        }

        setLoaded(true);
        emitter.emit("ready");
        emitter.emit("load", pageData);
      } catch (err) {
        sdkLog.error("[PageHub] Failed to load page:", err);
        emitter.emit("error", err);
        setLoaded(true); // Show empty canvas on error
      }
    }

    loadInitialData();
  }, [config.pageId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [_, setUnsavedChanges] = useAtomState(UnsavedChangesAtom);

  // Wire the save coordinator — single authoritative owner of the save
  // lifecycle. `instance.save()` funnels through here so callers get one
  // Promise + one mutex.
  useEffect(() => {
    const coordinator = getSaveCoordinator(emitter);

    const buildPageData = async (): Promise<PageData | null> => {
      const json = safeSerialize(query);
      if (!json) return null;
      const compressed = await compressAsync(json);
      // Lazy-load static-renderer so its ~25-file chunk (walker, stringify,
      // alpine inline) stays out of the editor's initial bundle — only fetched
      // on first save.
      const { renderToHTML } = await import("../../render/static/renderToHTML");
      const { html, classes, scrollObserverScript, renderError } = renderToHTML(json, {
        compressed: false,
      });
      if (renderError) {
        setEditorSaveBanner({ message: renderError });
      } else {
        setEditorSaveBanner(null);
      }

      // Build per-page shards — each page as its own compressed piece
      let shards: PageData["shards"] | undefined;
      try {
        const flat = JSON.parse(json);
        const pageIds = listPageNodeIds(query);
        if (pageIds.length > 0) {
          const sharedShard = extractSharedShard(flat);
          const pages: Record<string, string> = {};
          for (const pageId of pageIds) {
            if (flat[pageId]) {
              pages[pageId] = await compressAsync(JSON.stringify(extractPageShard(flat, pageId)));
            }
          }
          shards = {
            shared: await compressAsync(JSON.stringify(sharedShard)),
            pages,
            loadedPageIds: pageIds,
          };
        }
      } catch (shardErr) {
        sdkLog.warn(
          "[PageHub] Shard extraction failed, falling back to full-tree save:",
          shardErr
        );
      }

      return {
        content: compressed,
        html,
        classes,
        scrollObserverScript,
        shards,
      };
    };

    coordinator.configure({
      buildPageData,
      onSave: config.callbacks.onSave as any,
      applyServerContent: (content: any) => applyFetchedTree(content, query, actions),
      onConflictReload: config.callbacks.onConflictReload,
      notifyUpdatedAt: (updatedAt: string) => {
        emitter.emit("updated_at_changed", updatedAt);
      },
      onSaveSettled: () => {
        setUnsavedChanges(null);
      },
      onConflict: err => {
        emitter.emit("save_conflict", err);
      },
    });

    // Listen for load events
    const unsubLoad = emitter.onInternal("_doLoad", async (pageData: PageData) => {
      try {
        if (pageData?.content) {
          setBatchOperation(true);
          await applyFetchedTree(pageData.content, query, actions);
          requestAnimationFrame(() => setBatchOperation(false));
        }
      } catch (err) {
        sdkLog.error("[PageHub] Load error:", err);
        emitter.emit("error", err);
      }
    });

    const unsubUnsaved = emitter.on("unsaved_changes", (hasChanges: boolean) => {
      setUnsavedChanges((hasChanges ? safeSerialize(query) : null) as any);
    });

    return () => {
      unsubLoad();
      unsubUnsaved();
    };
  }, [query, actions, config.callbacks, emitter, setUnsavedChanges, setEditorSaveBanner]);

  // Debounced onChange handler
  const handleChange = useCallback(() => {
    if (!loaded || readOnly) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const json = safeSerialize(query);
        if (!json) return;
        const compressed = await compressAsync(json);
        const pageData: PageData = { content: compressed };

        config.callbacks.onChange?.(pageData);
        emitter.emit("change", pageData);
      } catch (err) {
        sdkLog.error("[PageHub] onChange error:", err);
      }
    }, 500);
  }, [loaded, readOnly, query, config.callbacks, emitter]);

  // Use onNodesChange to trigger the debounced save naturally instead of setInterval
  useEffect(() => {
    const unsub = emitter.onInternal("_nodes_changed", handleChange);
    return () => unsub();
  }, [handleChange, emitter]);
}
