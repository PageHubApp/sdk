// ─── Main configuration ──────────────────────────────────────────────────────

import type { ReactNode } from "react";
import type { PageHubCallbacks } from "./callbacks";
import type { PageHubTheme } from "./theme";
import type { PageHubFeatures } from "./features";
import type { PageHubAIConfig } from "./ai";
import type { PageHubLocale } from "./locale";

export interface PageHubConfig {
  /**
   * DOM element or CSS selector to mount the editor into (`PageHub.init()` only).
   * Optional when using the React `<PageHubProvider>` / `<PageHubEditor>` integration.
   */
  container?: HTMLElement | string;

  /** API key for authenticating with PageHub Cloud (optional for self-hosted) */
  apiKey?: string;

  /** Customer's integration callbacks */
  callbacks: PageHubCallbacks;

  /** Visual theming */
  theme?: PageHubTheme;

  /** Feature toggles */
  features?: PageHubFeatures;

  /** AI configuration */
  ai?: PageHubAIConfig;

  /** Localization */
  locale?: PageHubLocale;

  /** Initial page ID to load. If omitted, calls onLoad(undefined) */
  pageId?: string;

  /** Start in read-only mode (viewer). Default: false */
  readOnly?: boolean;

  /**
   * Base URL for API calls (e.g. 'https://example.com/api').
   * Required for features that make server requests (save, AI, media, etc.).
   */
  apiBaseUrl?: string;

  /** CDN configuration for image delivery */
  cdn?: {
    /** Cloudflare Images account hash (required for image rendering) */
    accountHash?: string;
    /** CDN base URL (e.g. 'https://imagedelivery.net') */
    baseUrl?: string;
    /** Image variant. Default: 'public' */
    variant?: string;
  };

  /** Custom components registered via defineComponent() */
  components?: import("../define/types").ResolvedComponentDef[];

  /**
   * Host-rendered docked panel (e.g. AI assistant). Shown when `features.aiGeneration` is true.
   * The SDK provides layout placement only; all product UI and API calls live in the host.
   * Use `useSDK()` inside your component if you need the emitter / config.
   */
  aiPanel?: ReactNode;

  /**
   * Override the toolbox preset list per component. **Replaces** the built-in
   * list — host wins. Use the `@pagehub/sdk/presets/<component>` sub-path to
   * compose with built-ins:
   *
   * ```ts
   * import { containerPresets } from "@pagehub/sdk/presets/container";
   * <PageHubProvider config={{
   *   presets: { Container: [...containerPresets, mine] },
   * }}>
   * ```
   */
  presets?: Record<string, import("../define/types").ComponentPreset[]>;

  /**
   * Override the modifier list per component. **Replaces** the built-in list.
   * Compose via `@pagehub/sdk/modifiers/<component>` sub-paths.
   */
  modifiers?: Record<string, import("../define/types").ComponentModifier[]>;

  /**
   * URL strategy for page navigation in the editor.
   * When provided, the SDK uses pushState/popstate to manage page URLs
   * (browser back/forward works). When omitted (standalone SDK),
   * page switching happens in-memory only.
   */
  urlStrategy?: import("../utils/page/pageNavigation").UrlStrategy;

  /**
   * Google Fonts picker rails (`popular` / `funky` order) and extra names for API-less fallback.
   * Omitted → stock `DEFAULT_CURATED_GOOGLE_FONT_FAMILIES` in `utils/fonts/curatedGoogleFontFamilies`.
   */
  curatedGoogleFontFamilies?: import("../utils/fonts/curatedGoogleFontFamilies").CuratedGoogleFontFamilies;

  /**
   * Responsive preview device frames (dropdown in device mode). Omitted → stock list in
   * `chrome/viewport/viewportDevicePresets`. Use a non-empty array; `"Custom"` is optional but
   * keeps the same UX as stock when users edit W×H manually.
   */
  viewportDevicePresets?: readonly import("../chrome/viewport/viewportDevicePresets").ViewportDevicePreset[];
}
