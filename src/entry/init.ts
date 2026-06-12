/**
 * @pagehub/sdk — imperative `init()` entry point.
 *
 * Extracted from `index.ts` (which is now a pure re-export barrel). This is the
 * primary integration point for non-React apps: it mounts a React tree into a
 * container and returns the `PageHubInstance` controller.
 *
 * `index.ts` re-exports the default `PageHub` and the named `init` from here.
 */

import lz from "lzutf8";
import React from "react";
import { createRoot } from "react-dom/client";

import { configureCdn } from "../utils/cdn";
import {
  resetCuratedGoogleFontFamilies,
  setCuratedGoogleFontFamilies,
} from "../utils/fonts/googleFonts";
import {
  resetViewportDevicePresets,
  setViewportDevicePresets,
} from "../chrome/viewport/viewportDevicePresets";
import { registerSubmissionHandler } from "../utils/submissions";
import { resolveConfig } from "../config";
import { PageHubProvider } from "../core/context";
import { PageHubEditor } from "../editor";
import { EventEmitter } from "../core/events";
import { getSaveCoordinator } from "../core/saveCoordinator";
import { renderToHTML } from "../render/static/renderToHTML";
import type { RenderToHTMLOptions, RenderToHTMLResult } from "../render/static/types";
import { injectTailwindBrowser, removeTailwindBrowser } from "../core/tailwindBrowser";
import { injectTheme, removeTheme } from "../core/theme";
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
} from "../types";
import { setPageHubApiBaseUrl } from "../core/apiConfig";
import { createRegistriesBundle } from "../registry";
import { mountKeybindingDispatcher } from "../registry/dispatcher";
import { sdkLog } from "../utils/logger";

// Side-effect import: RegistrySettings self-registers with InspectorRegistry
// at module load time. Must come AFTER built-in component graph is loadable (see
// componentRegistry.ts) — the editor / componentRegistry imports above ensure that.
import "../chrome/toolbar/inspector/RegistrySettings";

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
export function init(config: PageHubConfig): PageHubInstance {
  const resolved = resolveConfig(config);
  const emitter = new EventEmitter();

  // Build the registries bundle once and hand it to the Provider so the
  // returned instance and the React tree see the same maps.
  const registries = createRegistriesBundle();
  registries.context.setCommandContext({ features: resolved.features });

  // Wave B1 — mount the doc-level keybinding dispatcher. Coexists harmlessly
  // with existing keyboard handlers while built-in commands are stubbed.
  // Returned unmount fn is invoked from `destroy()` below.
  const unmountKeybindingDispatcher = mountKeybindingDispatcher({
    commands: registries.commands,
    keybindings: registries.keybindings,
    context: registries.context,
  });

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
      sdkLog.error("Form submission error:", e);
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
      { config: resolved, emitter, registries },
      React.createElement(PageHubEditor, {
        // Pass the host's resolver overrides ONLY. editor.tsx layers them on
        // top of DEFAULT_CRAFT_RESOLVER + the editor-variant customResolver
        // from processForEditor. Pre-merging DEFAULT here would re-add the
        // viewer-variant components AFTER the editor variants, clobbering
        // them and breaking editor-only behavior (empty-state hints, drag
        // chrome, etc.).
        resolver: (config as any).resolver,
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
        sdkLog.error("[PageHub] getPageData error:", err);
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
      unmountKeybindingDispatcher();
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
        sdkLog.error("[PageHub] exportJSON error:", err);
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
        sdkLog.error("[PageHub] getHTML error:", err);
        return "";
      }
    },

    commands: registries.commands,
    menus: registries.menus,
    slots: registries.slots,
    keybindings: registries.keybindings,
    context: registries.context,

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
        sdkLog.error("[PageHub] exportHTML error:", err);
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

// Default export — the PageHub namespace with .init()
const PageHub = { init };
export default PageHub;
