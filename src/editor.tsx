/**
 * @pagehub/sdk — Editor component (React)
 *
 * This is the main React component that wraps CraftJS and provides
 * the full editing experience. It's mounted by PageHub.init()
 * or can be used directly in React apps via <PageHubEditor />.
 */

// Styles: bundled separately as dist/editor.css (import "@pagehub/sdk/editor.css").
// For Next.js, import styles/globals.css in pages/_app.tsx.

import { Editor } from "@craftjs/core";
import { EcosystemProvider } from "@zedux/react";
import React, { useRef } from "react";
import { Inspector } from "./chrome/toolbar/inspector/InspectorRegistry";
import { resolveConfig } from "./config";
import { BUILTIN_COMPONENT_DEFS, DEFAULT_CRAFT_RESOLVER } from "./core/componentRegistry";
import { PageHubProvider, useHasSDKProvider, useSDK } from "./core/context";
import { EventEmitter } from "./core/events";
import { getSaveCoordinator } from "./core/saveCoordinator";
import { getComponentAllowlist } from "./define/componentAllowlist";
import { applyHostConstraints } from "./define/hostConstraints";
import { CustomComponentsContext } from "./define/context";
import { processForEditor } from "./define/processors/forEditor";
import type { ResolvedComponentDef } from "./define/types";
import type {
  PageHubCallbacks,
  PageHubConfig,
  PageHubFeatures,
  PageHubTheme,
} from "./types";
import { ConfigError } from "./utils/errors";
import { createValueStore } from "./utils/createValueStore";

// ─── Editor chrome ──
import { RenderNodeNewer } from "./chrome/rendering/RenderNode";
import CustomEventHandlers from "./chrome/shell/CustomEventHandlers";
import { BorderResizeController } from "./chrome/canvas/controllers/BorderResizeController";
import { RotateHandleController } from "./chrome/canvas/controllers/RotateHandleController";
import { ChromeErrorBoundary } from "./chrome/shell/ChromeErrorBoundary";
import { DragPreviewLayer } from "./chrome/shell/DragPreviewLayer";
import { DropZoneIndicator } from "./chrome/shell/DropZoneIndicator";
import { MediaLibraryMirror } from "./utils/media/useMirrorMediaLibraryToRoot";
import { EditorLoader } from "./chrome/shell/EditorLoader";
import { DefaultEditorLayout } from "./chrome/shell/DefaultEditorLayout";
import { EditorDocumentLoadedContext } from "./chrome/shell/useEditorDocument";
import { EditorSelectionDomProvider } from "./chrome/shell/EditorSelectionDomContext";
import { EditorServices } from "./chrome/shell/EditorServices";
import { EditorRootRectContext, createEditorRootRectStore } from "./chrome/shell/editorRootRect";
import { setPanelUrlPrefix } from "./utils/usePanelUrl";
import { onBesideDrop } from "./chrome/shell/besideDrop";
import { findPosition2DForEditor } from "./chrome/shell/findPosition2D";
import { setFindPositionEditorQuery } from "./chrome/shell/findPositionQueryRef";
import { Container } from "./components/Container/Container";

const ToolTipDialog = React.lazy(() =>
  import("./chrome/toolbar/dialogs/TooltipDialog").then(m => ({ default: m.ToolTipDialog }))
);

// Side-effect import: RegistrySettings self-registers with InspectorRegistry
import "./chrome/toolbar/inspector/RegistrySettings";

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
  /** False while the host keeps the editor mounted but hidden. See `PageHubProviderProps.active`. */
  active?: boolean;
  /** Host-rendered docked panel (e.g. assistant). Same as `PageHubConfig.aiPanel`. */
  aiPanel?: PageHubConfig["aiPanel"];
  /**
   * `"default"` (the default): the editor draws its own sidebar, header and
   * canvas. `"none"`: it draws nothing visible; render the pieces from
   * `@pagehub/sdk/editor/pieces` as `children` (directly or through portals)
   * and arrange them yourself. Document load/save, shortcuts and the editor's
   * dialogs run either way.
   */
  layout?: "default" | "none";
  /**
   * Shown in place of the editor while it gets ready (built-in catalogs).
   * Defaults to the SDK's spinner; a host with its own skeleton passes it here.
   */
  loading?: React.ReactNode;
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
      throw new ConfigError({
        code: "CONFIG_CALLBACKS_REQUIRED",
        message:
          "[PageHub] <PageHubEditor> requires callbacks prop when used without <PageHubProvider>",
        hint: "Either pass `callbacks={{ onSave, onLoad }}` directly, or wrap the editor in <PageHubProvider config={...}>.",
      });
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
      aiPanel: props.aiPanel,
    })
  );

  return (
    <PageHubProvider config={config} emitter={emitter} active={props.active}>
      <PageHubEditorInner
        resolver={props.resolver}
        components={props.components}
        onQueryReady={props.onQueryReady}
        onNodesChange={props.onNodesChange}
        layout={props.layout}
        loading={props.loading}
      >
        {props.children}
      </PageHubEditorInner>
    </PageHubProvider>
  );
}

// Stable defaults, so the memoised resolver and component defs hold across renders.
const NO_RESOLVER = {};
const NO_COMPONENTS: NonNullable<PageHubEditorProps["components"]> = [];

function PageHubEditorInner({
  resolver = NO_RESOLVER,
  components = NO_COMPONENTS,
  onQueryReady,
  onNodesChange,
  layout = "default",
  loading,
  children,
}: Pick<
  PageHubEditorProps,
  "resolver" | "components" | "onQueryReady" | "onNodesChange" | "layout" | "loading"
> & {
  children?: React.ReactNode;
}) {
  const { readOnly, config, emitter } = useSDK();

  // Eager-load built-in catalog files (presets + modifiers) ONCE at editor mount,
  // then apply per-component host overrides from `config.{presets,modifiers}`.
  // Viewer / static-renderer never call this — their bundles drop catalog code.
  const [catalogsReady, setCatalogsReady] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ loadBuiltinCatalogs }, { registerPresets, registerModifiers }] = await Promise.all([
        import("./define/loadBuiltinCatalogs"),
        import("./define/catalogRegistry"),
      ]);
      await loadBuiltinCatalogs();
      // Host overrides win — replace semantics keyed by component name
      const hostPresets = config.presets;
      if (hostPresets) {
        for (const [name, list] of Object.entries(hostPresets)) registerPresets(name, list);
      }
      const hostModifiers = config.modifiers;
      if (hostModifiers) {
        for (const [name, list] of Object.entries(hostModifiers)) registerModifiers(name, list);
      }
      if (!cancelled) setCatalogsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [config.presets, config.modifiers]);

  // Process component definitions (built-in migrated + consumer custom) into resolver + toolbox data.
  //
  // Two host-supplied filters apply here before the toolbox is built:
  //  1. `features.componentAllowlist` — when set, ONLY listed components survive.
  //  2. `features.restrictedComponents` — deny-list applied after the allowlist.
  //
  // The resolver still receives every built-in component (so deserialized nodes from
  // pre-existing data can hydrate) — only the toolbox-visible defs are trimmed.
  const restrictedSet = React.useMemo(
    () => new Set(config.features?.restrictedComponents ?? []),
    [config.features?.restrictedComponents]
  );
  const componentAllowlist = config.features?.componentAllowlist;
  const catalogFilters = config.features?.catalogFilters;
  const allDefs = React.useMemo(() => {
    // This editor owns the host constraints while it's mounted: they're set here,
    // at render and before anything reads them, so the order another editor's
    // unmount cleanup runs in doesn't matter.
    applyHostConstraints({ componentAllowlist, catalogFilters });
    const allowlist = getComponentAllowlist();
    const merged = [...BUILTIN_COMPONENT_DEFS, ...components];
    return merged.filter(def => {
      if (allowlist && !allowlist.has(def.name)) return false;
      if (restrictedSet.has(def.name)) return false;
      return true;
    });
  }, [components, restrictedSet, componentAllowlist, catalogFilters]);
  const { resolver: customResolver, toolboxCategories } = React.useMemo(
    () => processForEditor(allDefs, Inspector),
    [allDefs]
  );

  // Always merge the SDK's built-in resolver so CraftJS can resolve deserialized
  // node types (Container, Button, etc.) even with no outer app resolver.
  // The outer app resolver takes precedence so host apps can override components.
  // Memoised: a new object every render would hand Craft new options each time.
  const mergedResolver = React.useMemo(
    () => ({ ...DEFAULT_CRAFT_RESOLVER, ...customResolver, ...resolver }),
    [customResolver, resolver]
  );

  const customComponentsValue = React.useMemo(() => ({ toolboxCategories }), [toolboxCategories]);

  // Drawer URL params are read and written as `<prefix>panel`, … while this editor is mounted.
  const panelUrlPrefix = config.features?.panelUrlPrefix ?? "";
  React.useLayoutEffect(() => {
    setPanelUrlPrefix(panelUrlPrefix);
    return () => setPanelUrlPrefix("");
  }, [panelUrlPrefix]);

  // Flips once the initial document is applied; the canvas swaps its loader for <Frame />.
  const [documentLoaded] = React.useState(() => createValueStore(false));

  // The editor root's box, for chrome that sizes to the editor instead of the window.
  const [rootRect] = React.useState(createEditorRootRectStore);
  const rootElRef = useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    if (!catalogsReady || !rootElRef.current) return;
    return rootRect.observe(rootElRef.current);
  }, [catalogsReady, rootRect]);

  // Hold render until built-in catalogs (presets + modifiers) are loaded — otherwise
  // the toolbox flashes empty and AI-driven inserts may resolve to fallback presets.
  if (!catalogsReady) {
    return loading !== undefined ? <>{loading}</> : <EditorLoader />;
  }

  return (
    <div
      ref={rootElRef}
      className="pagehub-sdk-root"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <EditorRootRectContext.Provider value={rootRect}>
      <EditorDocumentLoadedContext.Provider value={documentLoaded}>
      <ChromeErrorBoundary region="editor">
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
              getSaveCoordinator(emitter).markDirty();
              emitter.emitInternal("_nodes_changed");
              if (onNodesChange) onNodesChange(query);
            }}
            findPosition={findPosition2DForEditor}
            onBesideDrop={onBesideDrop(Container)}
            shouldPromoteToParent={(node, parent) => {
              // CraftJS calls this when cursor is within 10px of `node`'s border to ask
              // whether to bubble up the drop target to `parent`. False = stay in node.
              const displayName = node.data?.custom?.displayName;
              if (displayName === "Row" || displayName === "Item") return false;
              // Only block when promoting INTO another flex-row (truly inside a nested
              // row layout). A flex-row section whose parent is a flex-col page should
              // bubble — that's how "drop between sections" works.
              const dom = node.dom as HTMLElement | undefined;
              const dir = dom ? window.getComputedStyle(dom).flexDirection : null;
              if (dir === "row" || dir === "row-reverse") {
                const parentDom = parent?.dom as HTMLElement | undefined;
                const parentDir = parentDom
                  ? window.getComputedStyle(parentDom).flexDirection
                  : null;
                if (parentDir === "row" || parentDir === "row-reverse") return false;
              }
              return true;
            }}
            handlers={store => {
              setFindPositionEditorQuery(store.query);
              return new CustomEventHandlers({
                store,
                isMultiSelectEnabled: () => false,
                removeHoverOnMouseleave: true,
              });
            }}
            indicator={{
              enabled: false,
              success: "currentColor",
              error: "rgb(153 27 27)",
              transition: "0.15s ease",
              thickness: 4,
              sectionThickness: 40,
              sectionParentTypes: ["page", "header", "footer"],
              className: "drop-zone-active",
              fullWidth: true,
            }}
          >
            <EditorSelectionDomProvider>
              <MediaLibraryMirror />
              <DropZoneIndicator />
              <DragPreviewLayer />
              <BorderResizeController />
              <RotateHandleController />
              {layout === "default" && <DefaultEditorLayout />}
              {/* Document load/save, editor-wide effects and singleton dialogs, in every layout. */}
              <EditorServices onQueryReady={onQueryReady} />
              {children}
            </EditorSelectionDomProvider>
          </Editor>
        </CustomComponentsContext.Provider>
      </EcosystemProvider>
      </ChromeErrorBoundary>
      </EditorDocumentLoadedContext.Provider>
      </EditorRootRectContext.Provider>
    </div>
  );
}
