/**
 * @pagehub/sdk — Editor component (React)
 *
 * This is the main React component that wraps CraftJS and provides
 * the full editing experience. It's mounted by PageHub.init()
 * or can be used directly in React apps via <PageHubEditor />.
 */

// Styles: bundled separately in the UMD dist (dist/editor.css).
// For Next.js, import styles/globals.css in pages/_app.tsx.

import { Editor, Frame, useEditor } from "@craftjs/core";
import { compressAsync, decompressAsync, terminateCompressionWorker } from "./utils/compressionAsync";
import { renderToHTML } from "./static-renderer";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { EcosystemProvider, useAtomState } from "@zedux/react";
import { useSetAtomState } from "./utils/atoms";
import { useSDK, useHasSDKProvider, PageHubProvider } from "./core/context";
import { resolveConfig } from "./config";
import { EventEmitter } from "./core/events";
import type {
  PageData,
  PageHubCallbacks,
  PageHubConfig,
  PageHubFeatures,
  PageHubTheme,
} from "./types";
import { BatchOperationAtom, EditorSaveBannerAtom } from "./utils/atoms";
import { processForEditor, CustomComponentsContext, type ResolvedComponentDef } from "./define";
import { LazyUnifiedSettings } from "./components/LazyUnifiedSettings";
import { markPageLoaded, clearLoadedPages, getLoadedPages, listPageNodeIds } from "./utils/pageManagement";
import { extractPageShard, extractSharedShard } from "./utils/treeSharding";
import { BUILTIN_COMPONENT_DEFS, DEFAULT_CRAFT_RESOLVER } from "./core/componentRegistry";

// ─── Import the real Viewport, Toolbar, and all dialog components from the editor chrome ──
import { Viewport } from "./chrome/viewport/ViewportShell";
import { UnsavedChangesAtom } from "./chrome/viewport/atoms";
import { Toolbar } from "./chrome/toolbar";
import { EditorSelectionDomProvider } from "./chrome/shell/EditorSelectionDomContext";
import { RenderNodeNewer } from "./chrome/rendering/RenderNode";
import CustomEventHandlers from "./chrome/shell/CustomEventHandlers";
import { BesideDropIndicator } from "./chrome/shell/BesideDropIndicator";
import { besideDetector, onBesideDrop } from "./chrome/shell/layoutInference";
import { AiPanelHost } from "./chrome/ai/AiPanelHost";
import { EditorLoader } from "./chrome/shell/EditorLoader";
import { GlobalSectionPickerDialog } from "./chrome/shell/GlobalSectionPickerDialog";
import { EditorSaveBanner } from "./chrome/shell/EditorSaveBanner";
import { sanitizeCraftSerializedContent } from "./utils/sanitizeNodeMap";
import { Container } from "./components/Container";

// Lazy-loaded dialogs — only loaded when user opens them
const ColorPickerDialog = React.lazy(() =>
  import("./chrome/toolbar/dialogs/ColorPickerDialog").then(m => ({ default: m.ColorPickerDialog }))
);
const ColorPickerSidebarDialog = React.lazy(() =>
  import("./chrome/toolbar/dialogs/ColorPickerSidebarDialog").then(m => ({
    default: m.ColorPickerSidebarDialog,
  }))
);
const FontFamilyDialog = React.lazy(() =>
  import("./chrome/toolbar/dialogs/FontFamilyDialog").then(m => ({ default: m.FontFamilyDialog }))
);
const GoogleIconDialog = React.lazy(() =>
  import("./chrome/toolbar/dialogs/GoogleIconDialog").then(m => ({ default: m.GoogleIconDialog }))
);
const IconDialogDialog = React.lazy(() =>
  import("./chrome/toolbar/dialogs/IconDialog").then(m => ({ default: m.IconDialogDialog }))
);
const PatternDialog = React.lazy(() =>
  import("./chrome/toolbar/dialogs/PatternDialog").then(m => ({ default: m.PatternDialog }))
);
const ToolTipDialog = React.lazy(() =>
  import("./chrome/toolbar/dialogs/TooltipDialog").then(m => ({ default: m.ToolTipDialog }))
);

// Side-effect import: UnifiedSettings self-registers with LazyUnifiedSettings
import "./chrome/toolbar/unified-settings/UnifiedSettings";

// ─── Internal editor wrapper that handles save/load ──────────────────────────

function EditorInner({ onQueryReady }: { onQueryReady?: (query: any) => void }) {
  const { config, emitter, readOnly } = useSDK();
  const { actions, query, connectors } = useEditor();
  const [loaded, setLoaded] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const setBatchOperation = useSetAtomState(BatchOperationAtom);
  const setEditorSaveBanner = useSetAtomState(EditorSaveBannerAtom);

  // Expose the query ref to the parent
  useEffect(() => {
    if (onQueryReady) onQueryReady(query);
  }, [query, onQueryReady]);

  // Load initial data
  useEffect(() => {
    async function loadInitialData() {
      try {
        const pageData = await config.callbacks.onLoad(config.pageId);

        if (pageData?.content) {
          setBatchOperation(true);
          const decompressed = await decompressAsync(pageData.content);
          actions.deserialize(sanitizeCraftSerializedContent(decompressed) || "");
          // Track which pages are actually in the deserialized tree.
          // SSR may have assembled only one page + shared shard —
          // unloaded pages will be fetched on demand via isolatePageLazy.
          clearLoadedPages();
          requestAnimationFrame(() => {
            for (const id of listPageNodeIds(query)) markPageLoaded(id);
            setBatchOperation(false);
          });
        }

        setLoaded(true);
        emitter.emit("ready");
        emitter.emit("load", pageData);
      } catch (err) {
        console.error("[PageHub] Failed to load page:", err);
        emitter.emit("error", err);
        setLoaded(true); // Show empty canvas on error
      }
    }

    loadInitialData();
  }, [config.pageId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [_, setUnsavedChanges] = useAtomState(UnsavedChangesAtom);

  // Listen for save events from the Instance API
  useEffect(() => {
    const unsubSave = emitter.on("save", async (meta?: any) => {
      try {
        const json = query.serialize();
        const compressed = await compressAsync(json);
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
          console.warn("[PageHub] Shard extraction failed, falling back to full-tree save:", shardErr);
        }

        const pageData: PageData = { content: compressed, html, classes, scrollObserverScript, shards };
        await config.callbacks.onSave(pageData, meta);
        setUnsavedChanges(null);
      } catch (err) {
        console.error("[PageHub] Save error:", err);
        emitter.emit("error", err);
      }
    });

    // Listen for load events
    const unsubLoad = emitter.onInternal("_doLoad", async (pageData: PageData) => {
      try {
        if (pageData?.content) {
          setBatchOperation(true);
          const decompressed = await decompressAsync(pageData.content);
          actions.deserialize(sanitizeCraftSerializedContent(decompressed) || "");
          requestAnimationFrame(() => setBatchOperation(false));
        }
      } catch (err) {
        console.error("[PageHub] Load error:", err);
        emitter.emit("error", err);
      }
    });

    const unsubUnsaved = emitter.on("unsaved_changes", (hasChanges: boolean) => {
      setUnsavedChanges((hasChanges ? query.serialize() : null) as any);
    });

    return () => {
      unsubSave();
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
        const json = query.serialize();
        const compressed = await compressAsync(json);
        const pageData: PageData = { content: compressed };

        config.callbacks.onChange?.(pageData);
        emitter.emit("change", pageData);
      } catch (err) {
        console.error("[PageHub] onChange error:", err);
      }
    }, 500);
  }, [loaded, readOnly, query, config.callbacks, emitter]);

  // Use onNodesChange to trigger the debounced save naturally instead of setInterval
  useEffect(() => {
    const unsub = emitter.onInternal("_nodes_changed", handleChange);
    return () => unsub();
  }, [handleChange, emitter]);

  if (!loaded) {
    return <EditorLoader />;
  }

  return <Frame />;
}

// ─── Public Editor React component ───────────────────────────────────────────

interface PageHubEditorProps {
  /** CraftJS resolver components */
  resolver?: Record<string, React.ComponentType<any>>;
  /** Custom components registered via defineComponent() */
  components?: ResolvedComponentDef[];
  /** Callback to receive the CraftJS query object */
  onQueryReady?: (query: any) => void;
  /** Callback for when nodes are changed */
  onNodesChange?: (query: any) => void;

  // ─── Standalone props (no PageHubProvider needed) ──────────────────
  /** Your integration callbacks (onLoad, onSave, etc.) */
  callbacks?: PageHubCallbacks;
  /** Visual theming */
  theme?: PageHubTheme;
  /** Feature toggles */
  features?: Partial<PageHubFeatures>;
  /** PageHub API base URL. Default: "https://pagehub.dev/api" */
  apiBaseUrl?: string;
  /** Start in read-only mode. Default: false */
  readOnly?: boolean;
  /** Host-rendered docked panel (e.g. assistant). Same as `PageHubConfig.renderAiPanel`. */
  renderAiPanel?: PageHubConfig["renderAiPanel"];
  /** Content rendered inside the CraftJS <Editor> tree (has access to useEditor) */
  children?: React.ReactNode;
}

/**
 * The main editor React component.
 *
 * Can be used standalone (pass callbacks/theme/features directly)
 * or nested inside a <PageHubProvider> for advanced control.
 *
 * Standalone:
 *   <PageHubEditor callbacks={{ onLoad, onSave }} theme={{ primaryColor: "#e11d48" }} />
 *
 * With provider:
 *   <PageHubProvider config={config} emitter={emitter}>
 *     <PageHubEditor />
 *   </PageHubProvider>
 */
export function PageHubEditor(props: PageHubEditorProps) {
  const hasProvider = useHasSDKProvider();

  if (!hasProvider) {
    // Standalone mode — create provider + emitter automatically
    if (!props.callbacks) {
      throw new Error(
        "[PageHub] <PageHubEditor> requires callbacks prop when used without <PageHubProvider>"
      );
    }
    return <PageHubEditorStandalone {...props} callbacks={props.callbacks} />;
  }

  return <PageHubEditorInner {...props}>{props.children}</PageHubEditorInner>;
}

/** Standalone wrapper — creates the provider automatically. */
function PageHubEditorStandalone(props: PageHubEditorProps & { callbacks: PageHubCallbacks }) {
  const [emitter] = React.useState(() => new EventEmitter());
  const [config] = React.useState(() =>
    resolveConfig({
      callbacks: props.callbacks,
      theme: props.theme,
      features: props.features,
      apiBaseUrl: props.apiBaseUrl ?? "",
      readOnly: props.readOnly,
      renderAiPanel: props.renderAiPanel,
    })
  );

  return (
    <PageHubProvider config={config} emitter={emitter}>
      <PageHubEditorInner
        resolver={props.resolver}
        components={props.components}
        onQueryReady={props.onQueryReady}
        onNodesChange={props.onNodesChange}
      >
        {props.children}
      </PageHubEditorInner>
    </PageHubProvider>
  );
}

function PageHubEditorInner({
  resolver = {},
  components = [],
  onQueryReady,
  onNodesChange,
  children,
}: Pick<PageHubEditorProps, "resolver" | "components" | "onQueryReady" | "onNodesChange"> & {
  children?: React.ReactNode;
}) {
  const { readOnly, config, emitter } = useSDK();
  const showToolbar = config.features?.toolbar !== false;
  const showSidebar = config.features?.sidebar !== false;

  // Process component definitions (built-in migrated + consumer custom) into resolver + toolbox data
  const allDefs = React.useMemo(() => [...BUILTIN_COMPONENT_DEFS, ...components], [components]);
  const { resolver: customResolver, toolboxCategories } = React.useMemo(
    () => processForEditor(allDefs, LazyUnifiedSettings),
    [allDefs]
  );

  // Always merge the SDK's built-in resolver so CraftJS can resolve deserialized
  // node types (Container, Button, etc.) even with no outer app resolver.
  // The outer app resolver takes precedence so host apps can override components.
  const mergedResolver = { ...DEFAULT_CRAFT_RESOLVER, ...customResolver, ...resolver };

  const customComponentsValue = React.useMemo(() => ({ toolboxCategories }), [toolboxCategories]);

  return (
    <div
      className="pagehub-sdk-root"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* If an ancestor EcosystemProvider already exists (e.g. the
           PageHub app's _app.tsx), atoms are shared via the same ecosystem.
           When used standalone, this creates its own ecosystem. */}
      <EcosystemProvider>
        <CustomComponentsContext.Provider value={customComponentsValue}>
          <ToolTipDialog />

          <Editor
            resolver={mergedResolver}
            enabled={!readOnly}
            onRender={RenderNodeNewer}
            onNodesChange={query => {
              emitter.emitInternal("_nodes_changed");
              if (onNodesChange) onNodesChange(query);
            }}
            besideDetector={besideDetector}
            onBesideDrop={onBesideDrop(Container)}
            handlers={store =>
              new CustomEventHandlers({
                store,
                isMultiSelectEnabled: () => false,
                removeHoverOnMouseleave: true,
              })
            }
            indicator={{
              success: "currentColor",
              error: "rgb(153 27 27)",
              transition: "0.15s ease",
              thickness: 4,
              sectionThickness: 40,
              sectionParentTypes: ["page", "header", "footer"],
              className: "drop-zone-active",
            }}
          >
            <EditorSelectionDomProvider>
              <BesideDropIndicator />
              <div
                className="bg-neutral text-neutral-content relative flex h-full min-h-0 w-full flex-col overflow-hidden"
                data-base={true}
              >
                {!readOnly && <EditorSaveBanner />}
                <div className="relative flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
                  {/* Settings sidebar */}
                  {showSidebar && !readOnly && <Toolbar />}

                  {/* Dialog overlays — color pickers, font selector, icons, patterns */}
                  {!readOnly && (
                    <>
                      <ColorPickerDialog />
                      <ColorPickerSidebarDialog />
                      <FontFamilyDialog />
                      <GoogleIconDialog />
                      <IconDialogDialog />
                      <PatternDialog />
                      <GlobalSectionPickerDialog />
                    </>
                  )}

                  {/* Viewport + docked AI panel column */}
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <Viewport>
                      <EditorInner onQueryReady={onQueryReady} />
                    </Viewport>
                    {!readOnly && config.features?.aiGeneration && <AiPanelHost />}
                  </div>
                </div>
              </div>
              {children}
            </EditorSelectionDomProvider>
          </Editor>
        </CustomComponentsContext.Provider>
      </EcosystemProvider>
    </div>
  );
}
