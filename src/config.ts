/**
 * @pagehub/sdk — Configuration store
 *
 * Holds the resolved config for the current SDK instance.
 * Provides defaults and validation.
 */

import { setPageHubApiBaseUrl } from "./runtimeApi";
import type { PageHubConfig, PageHubFeatures, PageHubTheme } from "./types";

const DEFAULT_FEATURES: Required<PageHubFeatures> = {
  sidebar: true,
  toolbar: true,
  aiGeneration: false,
  customCSS: false,
  importExport: false,
  seoPanel: true,
  multiPage: true,
  custom404Page: true,
  restrictedComponents: [],
  responsivePreview: true,
  directSave: false,
};

const DEFAULT_THEME: PageHubTheme = {
  primaryColor: "#2563eb",
  secondaryColor: "#7c3aed",
  accentColor: "#06b6d4",
  colorScheme: "system",
};

export interface ResolvedConfig extends PageHubConfig {
  features: Required<PageHubFeatures>;
  theme: Required<PageHubTheme>;
  /** Set when `config.container` resolves; omitted for React-only integrations. */
  containerEl?: HTMLElement;
}

export function resolveConfig(config: PageHubConfig): ResolvedConfig {
  // Resolve container element — only needed for the vanilla JS API, not the React integration.
  // All DOM access is guarded behind a browser check so this is safe to call during SSR.
  let containerEl: HTMLElement | undefined;

  if (typeof window !== "undefined") {
    if (typeof config.container === "string") {
      const el = document.querySelector(config.container);
      if (!el) {
        throw new Error(`[PageHub] Container element not found: "${config.container}"`);
      }
      containerEl = el as HTMLElement;
    } else if (
      config.container != null &&
      typeof HTMLElement !== "undefined" &&
      config.container instanceof HTMLElement
    ) {
      containerEl = config.container;
    }
    // If no container specified, that's fine — React integration mounts its own DOM
  }

  // Validate required callbacks
  if (!config.callbacks) {
    throw new Error(`[PageHub] "callbacks" is required in config`);
  }
  if (typeof config.callbacks.onSave !== "function") {
    throw new Error(`[PageHub] "callbacks.onSave" must be a function`);
  }
  if (typeof config.callbacks.onLoad !== "function") {
    throw new Error(`[PageHub] "callbacks.onLoad" must be a function`);
  }

  const resolvedConfig = {
    ...config,
    ...(containerEl != null ? { containerEl } : {}),
    features: {
      ...DEFAULT_FEATURES,
      ...config.features,
    },
    theme: {
      ...DEFAULT_THEME,
      ...config.theme,
    } as Required<PageHubTheme>,
    readOnly: config.readOnly ?? false,
    apiBaseUrl: config.apiBaseUrl ?? "",
  };

  if (typeof window !== "undefined") {
    setPageHubApiBaseUrl(resolvedConfig.apiBaseUrl);
  }

  return resolvedConfig;
}
