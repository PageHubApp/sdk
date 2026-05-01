/**
 * @pagehub/sdk — Main entry point
 *
 * This is the public API surface of the SDK.
 *
 * Usage (vanilla JS / any framework):
 * ```js
 * import PageHub from '@pagehub/sdk';
 *
 * const editor = PageHub.init({
 *   container: '#pagehub-editor',
 *   callbacks: {
 *     onSave: (pageData) => fetch('/api/save', { method: 'POST', body: JSON.stringify(pageData) }),
 *     onLoad: async (pageId) => (await fetch(`/api/load/${pageId}`)).json(),
 *   },
 *   theme: { primaryColor: '#2563eb' },
 * });
 *
 * // Later...
 * editor.save();
 * editor.destroy();
 * ```
 *
 * Usage (React):
 * ```tsx
 * import { PageHubEditor, PageHubProvider } from '@pagehub/sdk';
 *
 * <PageHubProvider config={resolvedConfig} emitter={emitter}>
 *   <PageHubEditor resolver={myComponents} />
 * </PageHubProvider>
 * ```
 */

// Global editor CSS is NOT imported here — Next.js forbids global CSS from packages (see
// https://nextjs.org/docs/messages/css-global). Vite emits `dist/editor.css` via
// `css/vite-editor-css-entry.ts`; npm users `import "@pagehub/sdk/editor.css"`. This app loads
// editor chrome via `styles/editor.css` in `pages/_app.tsx`.

import lz from "lzutf8";
import React from "react";
import { createRoot } from "react-dom/client";

import { configureCdn } from "./utils/cdn";
import {
  resetCuratedGoogleFontFamilies,
  setCuratedGoogleFontFamilies,
} from "./utils/fonts/googleFonts";
import {
  resetViewportDevicePresets,
  setViewportDevicePresets,
} from "./chrome/viewport/viewportDevicePresets";
import { registerSubmissionHandler } from "./utils/submissions";
import { resolveConfig } from "./config";
import { PageHubProvider } from "./core/context";
import { PageHubEditor } from "./editor";
import { EventEmitter } from "./core/events";
import { getSaveCoordinator } from "./core/saveCoordinator";
import { renderToHTML } from "./static-renderer/renderToHTML";
import type { RenderToHTMLOptions, RenderToHTMLResult } from "./static-renderer/types";
import { injectTailwindBrowser, removeTailwindBrowser } from "./core/tailwindBrowser";
import { injectTheme, removeTheme } from "./core/theme";
import type {
  PageData,
  PageHubConfig,
  PageHubEvent,
  PageHubFeatures,
  PageHubInstance,
  PageHubTheme,
  SaveMeta,
  SaveResult,
  SaveStatus,
} from "./types";
import { DEFAULT_CRAFT_RESOLVER } from "./core/componentRegistry";
import { setPageHubApiBaseUrl } from "./core/apiConfig";

// Side-effect import: RegistrySettings self-registers with InspectorRegistry
// at module load time. Must come AFTER built-in component graph is loadable (see componentRegistry.ts).
import "./chrome/toolbar/inspector/RegistrySettings";

// Add spinner animation
const SPINNER_CSS = `
@keyframes spin {
  to { transform: rotate(360deg); }
}
`;

/**
 * Initialize the PageHub editor.
 *
 * This is the primary integration point for non-React apps.
 * It mounts a React tree into the specified container and returns
 * a controller object for programmatic access.
 */
function init(config: PageHubConfig): PageHubInstance {
  const resolved = resolveConfig(config);
  const emitter = new EventEmitter();

  // Configure CDN from init config
  if (config.cdn) configureCdn(config.cdn);

  if (resolved.curatedGoogleFontFamilies) {
    setCuratedGoogleFontFamilies(resolved.curatedGoogleFontFamilies);
  } else {
    resetCuratedGoogleFontFamilies();
  }

  if (resolved.viewportDevicePresets && resolved.viewportDevicePresets.length > 0) {
    setViewportDevicePresets(resolved.viewportDevicePresets);
  } else {
    resetViewportDevicePresets();
  }

  // Register the form submission handler so Form components can POST to the API
  registerSubmissionHandler(async (submission, settings, additional = {}) => {
    try {
      const res = await fetch(`${resolved.apiBaseUrl}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission,
          name: settings?.name || settings?.draftId,
          mailTo: additional.mailTo,
          formName: additional.formName,
          webhookUrl: additional.webhookUrl,
        }),
      });
      return res.json();
    } catch (e) {
      console.error("Form submission error:", e);
    }
  });

  // Inject spinner animation globally (once)
  if (!document.getElementById("pagehub-global-css")) {
    const globalStyle = document.createElement("style");
    globalStyle.id = "pagehub-global-css";
    globalStyle.textContent = SPINNER_CSS;
    document.head.appendChild(globalStyle);
  }

  // Inject Tailwind v4 browser runtime (generates CSS on the fly for dynamic classes)
  injectTailwindBrowser();

  // Inject theme CSS variables
  injectTheme(resolved.containerEl, resolved.theme);

  // Mount React tree — UMD (script tags) may expose ReactDOM.createRoot; otherwise use ESM import.
  const globalReactDom = (
    globalThis as typeof globalThis & { ReactDOM?: { createRoot?: typeof createRoot } }
  ).ReactDOM;
  const root =
    typeof globalReactDom?.createRoot === "function"
      ? globalReactDom.createRoot(resolved.containerEl)
      : createRoot(resolved.containerEl);

  // Store a ref to the editor query for programmatic access
  let editorQueryRef: any = null;

  const handleQueryReady = (query: any) => {
    editorQueryRef = query;
  };

  root.render(
    React.createElement(
      PageHubProvider,
      { config: resolved, emitter },
      React.createElement(PageHubEditor, {
        resolver: { ...DEFAULT_CRAFT_RESOLVER, ...(config as any).resolver },
        components: config.components,
        onQueryReady: handleQueryReady,
      })
    )
  );

  // ─── Instance API ───────────────────────────────────────────────────

  const coordinator = getSaveCoordinator(emitter);

  const instance: PageHubInstance = {
    save(options?: SaveMeta): Promise<SaveResult> {
      return coordinator.save(options);
    },

    subscribeStatus(handler: (status: SaveStatus) => void) {
      return coordinator.subscribeStatus(handler);
    },

    invalidatePageList() {
      emitter.emit("page_list_invalidated");
    },

    async load(pageId: string) {
      try {
        const pageData = await resolved.callbacks.onLoad(pageId);
        if (pageData) {
          emitter.emitInternal("_doLoad", pageData);
          emitter.emit("load", pageData);
        }
      } catch (err) {
        emitter.emit("error", err);
      }
    },

    getPageData(): PageData {
      if (!editorQueryRef) return { content: "" };
      try {
        const json = editorQueryRef.serialize();
        const compressed = lz.encodeBase64(lz.compress(json));
        const { html, classes, scrollObserverScript } = renderToHTML(json, { compressed: false });
        return { content: compressed, html, classes, scrollObserverScript };
      } catch (err) {
        console.error("[PageHub] getPageData error:", err);
        return { content: "" };
      }
    },

    setReadOnly(readOnly: boolean) {
      emitter.emit("modeChange", readOnly ? "viewer" : "editor");
    },

    setTheme(theme: Partial<PageHubTheme>) {
      const merged = { ...resolved.theme, ...theme } as Required<PageHubTheme>;
      injectTheme(resolved.containerEl, merged);
    },

    setFeatures(features: Partial<PageHubFeatures>) {
      emitter.emitInternal("_setFeatures", features);
    },

    destroy() {
      root.unmount();
      removeTheme(resolved.containerEl);
      removeTailwindBrowser();
      emitter.removeAll();
      setPageHubApiBaseUrl("");
      resetCuratedGoogleFontFamilies();
      resetViewportDevicePresets();

      const globalStyle = document.getElementById("pagehub-global-css");
      if (globalStyle) globalStyle.remove();

      resolved.containerEl.innerHTML = "";
    },

    on(event: PageHubEvent, handler: (...args: any[]) => void) {
      return emitter.on(event, handler);
    },

    exportJSON(): string {
      if (!editorQueryRef) return "{}";
      try {
        return editorQueryRef.serialize();
      } catch (err) {
        console.error("[PageHub] exportJSON error:", err);
        return "{}";
      }
    },

    importJSON(json: string) {
      const compressed = lz.encodeBase64(lz.compress(json));
      emitter.emitInternal("_doLoad", { content: compressed });
    },

    getHTML(): string {
      if (!editorQueryRef) return "";
      try {
        const json = editorQueryRef.serialize();
        return renderToHTML(json, { compressed: false }).html;
      } catch (err) {
        console.error("[PageHub] getHTML error:", err);
        return "";
      }
    },

    exportHTML(options: Omit<RenderToHTMLOptions, "compressed"> = {}): RenderToHTMLResult {
      if (!editorQueryRef)
        return {
          html: "",
          classes: [],
          fontUrls: [],
          scrollObserverScript: "",
          themeCSS: "",
          seo: null,
        };
      try {
        const json = editorQueryRef.serialize();
        return renderToHTML(json, { ...options, compressed: false });
      } catch (err) {
        console.error("[PageHub] exportHTML error:", err);
        return {
          html: "",
          classes: [],
          fontUrls: [],
          scrollObserverScript: "",
          themeCSS: "",
          seo: null,
        };
      }
    },
  };

  return instance;
}

// ─── Exports ────────────────────────────────────────────────────────────────

// Default export — the PageHub namespace with .init()
const PageHub = { init };
export default PageHub;

// Named exports for React usage
export { PageHubProvider, useSDK, useSDKSafe } from "./core/context";
export { useAiEnabled } from "./utils/hooks/useAiEnabled";
export { PageHubEditor } from "./editor";
export { resolveConfig } from "./config";
export { PageHubViewer, renderViewer } from "./viewer";

// Component registration API
export { defineComponent } from "./define/defineComponent";
export type {
  ResolvedComponentDef,
  PropSchema,
  ComponentPreset,
  ComponentModifier,
  PeerInheritConfig,
} from "./define/types";

// Catalog registry — register/override component presets + modifiers per name.
// Built-in catalogs self-register at editor mount via loadBuiltinCatalogs().
export {
  registerPresets,
  getPresets,
  registerModifiers,
  getModifiers,
} from "./define/catalogRegistry";

// Type exports
export type {
  PageData,
  PageHubAIConfig,
  PageHubCallbacks,
  PageHubEditorChromeSlots,
  PageHubMediaEditAiActionsContext,
  PageHubMediaMetadataSuggestion,
  PageHubComponentDef,
  PageHubConfig,
  PageHubEvent,
  PageHubFeatures,
  PageHubInstance,
  PageHubLocale,
  PageHubTheme,
  PageSeo,
  SaveMeta,
  SaveResponse,
  SaveResult,
  SaveStatus,
} from "./types";

// Save error classes — value exports (consumers `instanceof` against these).
export { SaveConflictError, SaveEmptyError, SaveFailedError } from "./types";

// Alias
export type { PageSeo as PageHubSeo } from "./types";

// Nested node-prop namespaces — typed shapes for background, overflow, design, etc.
// `seo: PageSeo` (from "./types") is the canonical shape for seo.* props on ROOT + page Containers.
export type {
  BackgroundProps,
  OverflowProps,
  DesignProps,
  InjectProps,
  RelationProps,
  RichTextProps,
} from "./components/types";

// Make init available at top-level too
export { init };

// CDN configuration for advanced use
export { configureCdn } from "./utils/cdn";

// State registry — central reactive state surface (visibility, flags,
// selection, value). Wrappers write here; descendants read via conditions /
// stateModifiers / `{{state.X}}` interpolation. Direct hook access is rare
// (used by app-side cart provider / agent chat to bridge runtime hooks).
export {
  setState,
  getState,
  getStateValue,
  setVisibility,
  getVisibility,
  toggleVisibility,
  deleteState,
  useStateEntry,
  useStateValue,
  useGlobalStateTick,
} from "./utils/state/stateRegistry";
export type { StateEntry, StateKind, WriterSource } from "./utils/state/stateRegistry";

// URL ↔ state bridge — call once per viewer (from `useViewerSetup`) to mirror
// `URLSearchParams` ↔ `state["url:*"]`. Replaces the legacy
// `useUrlQueryCommerce` hook + `pagehub:url-query-changed` CustomEvent.
export { mountUrlQueryStateBridge, getUrlState } from "./utils/state/urlQueryBridge";

// Anchor context — wrappers (AgentFloatingBubble, AgentChat, CartDrawer, …)
// publish per-instance ids so descendant presets can reference them via
// `{{anchor.X}}` tokens in `id` / `action.target` / `state` condition keys.
// Replaces the legacy first-mount `walkAndFix` placeholder-rewrite pattern.
export {
  AnchorProvider,
  useAnchors,
  resolveAnchors,
  hasAnchorToken,
} from "./utils/anchors/anchorContext";
export type { AnchorMap } from "./utils/anchors/anchorContext";

/** Default Craft resolver map and built-in `defineComponent` defs (extend / merge for custom blocks). */
export {
  BUILTIN_COMPONENT_DEFS,
  DEFAULT_CRAFT_RESOLVER,
  getBuiltinComponentDef,
} from "./core/componentRegistry";
export type { BuiltInCraftResolver } from "./core/componentRegistry";

/** API base URL for SDK fetches (set by `resolveConfig` / `PageHubProvider`; host may call `setPageHubApiBaseUrl` early). */
export { getPageHubApiBaseUrl, setPageHubApiBaseUrl } from "./core/apiConfig";

// Export ported selector components for React users
export { Audio } from "./components/Audio/Audio";
export { Background } from "./components/Background/Background";
export { Button } from "./components/Button/Button";
export { Container } from "./components/Container/Container";
export { Data } from "./components/Data/Data";
export { Embed } from "./components/Embed/Embed";
export { Footer } from "./components/Footer/Footer";
export { Form } from "./components/Form/Form";
export { FormElement } from "./components/FormElement/FormElement";
export { Header } from "./components/Header/Header";
export { Icon } from "./components/Icon/Icon";
export { Image } from "./components/Image/Image";
export { Link } from "./components/Link/Link";
export { Map } from "./components/Map/Map";
export { MapPoint } from "./components/MapPoint/MapPoint";
export { Text } from "./components/Text/Text";
export { Video } from "./components/Video/Video";

// Export store hooks for advanced use
export { useView, usePreview, useEditorStore } from "./core/store";
export type { ViewMode } from "./core/store";

/** Main toolbar dock side + atom for integrations that need to mirror chrome. */
export { SideBarAtom, useEditorSidebarDockLeft } from "./utils/atoms";

// Static rendering
export { renderToHTML } from "./static-renderer/renderToHTML";
export { buildRootThemeCss } from "./static-renderer/themeCss";
export type { RenderToHTMLOptions, RenderToHTMLResult } from "./static-renderer/types";

// ─── Property Registry — public API for extending the settings sidebar ─────
export {
  registerProperties,
  overrideProperty,
  unregisterProperty,
  registerSectionDef,
  unregisterSectionDef,
  getSectionDefs,
  getSectionDef,
  getProperties,
  searchProperties,
} from "./chrome/toolbar/inspector/registry/propertyRegistry";

export type {
  PropertyDef,
  PropertyInput,
  SectionDef,
  SectionId,
  PropertyInputProps,
} from "./chrome/toolbar/inspector/registry/propertyDefs";

// CSS compilation — server-side only, import from "@pagehub/sdk/compile-css"
// NOT re-exported here to avoid Next.js/Turbopack treating readFileSync CSS paths as global imports
