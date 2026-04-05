/**
 * @pagehub/sdk — Core type definitions
 *
 * These types define the public API surface of the SDK.
 * Customers implement callbacks; we provide the editor.
 */

import type { ReactNode } from "react";

// ─── Page data ────────────────────────────────────────────────────────────────

/** Serialized page data — opaque to the customer, created/consumed by PageHub */
export interface PageData {
  /** CraftJS node tree as compressed base64 (internal format — for reloading the editor) */
  content: string;
  /** Rendered static HTML (the deliverable — for publishing, emails, etc.) */
  html?: string;
  /** Tailwind CSS classes used in the HTML (for CSS compilation) */
  classes?: string[];
  /** Human readable page title */
  title?: string;
  /** Optional page-level SEO metadata */
  seo?: PageSeo;
  /** IntersectionObserver script for CSS scroll animations (inject before </body>) */
  scrollObserverScript?: string;
}

export interface PageSeo {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  robots?: string;
}

// ─── Callbacks — the customer's integration points ────────────────────────────

export interface PageHubCallbacks {
  /**
   * Called when the user saves a page.
   * The customer persists `pageData` to their own database.
   */
  onSave: (pageData: PageData, meta?: { isDraft: boolean }) => Promise<void> | void;

  /**
   * Called when the editor needs to load a page.
   * The customer fetches from their own database.
   * Return `null` for a blank canvas.
   */
  onLoad: (pageId?: string) => Promise<PageData | null> | PageData | null;

  /** Emitted on every editor state change (debounced). Useful for auto-save. */
  onChange?: (pageData: PageData) => void;

  /** Called when the user publishes (promotes draft → live). */
  onPublish?: (pageData: PageData) => Promise<void> | void;

  /** Called when media needs to be uploaded. Return the public URL. */
  onMediaUpload?: (file: File) => Promise<string>;

  /** Called when media should be deleted */
  onMediaDelete?: (url: string) => Promise<void>;
}

// ─── Theming ──────────────────────────────────────────────────────────────────

export interface PageHubTheme {
  /** Primary brand colour (hex, hsl, rgb) */
  primaryColor?: string;
  /** Secondary brand colour */
  secondaryColor?: string;
  /** Accent colour */
  accentColor?: string;
  /** Logo URL shown in the editor toolbar */
  logo?: string;
  /** Custom CSS variables to inject (key-value, no `--` prefix needed) */
  cssVariables?: Record<string, string>;
  /** Raw CSS to inject into the editor iframe */
  customCSS?: string;
  /** Dark mode preference */
  colorScheme?: "light" | "dark" | "system";
}

// ─── Feature flags ────────────────────────────────────────────────────────────

export interface PageHubFeatures {
  /** Show/hide the sidebar component panel. Default: true */
  sidebar?: boolean;
  /** Show/hide the top toolbar. Default: true */
  toolbar?: boolean;
  /** Allow AI-powered generation. Default: false (requires AI API key) */
  aiGeneration?: boolean;
  /** Allow custom CSS editing. Default: false */
  customCSS?: boolean;
  /** Allow HTML import/export. Default: false */
  importExport?: boolean;
  /** Show SEO settings panel. Default: true */
  seoPanel?: boolean;
  /** Allow multi-page sites. Default: true */
  multiPage?: boolean;
  /** Components to hide from the toolbox. */
  restrictedComponents?: string[];
  /** Enable responsive device preview toggle. Default: true */
  responsivePreview?: boolean;
  /** Save directly without showing the domain/publish picker. Default: false */
  directSave?: boolean;
}

// ─── AI Configuration ─────────────────────────────────────────────────────────

export interface PageHubAIConfig {
  /** Enable AI features (requires PageHub account). Default: false */
  enabled?: boolean;
}

// ─── Locale ───────────────────────────────────────────────────────────────────

export interface PageHubLocale {
  /** ISO language code (e.g. 'en', 'fr', 'de') */
  language?: string;
  /** Override specific UI strings */
  strings?: Record<string, string>;
}

// ─── Host-injected assistant panel (no AI implementation in the SDK) ─────────

/** Context passed to `renderAiPanel` — same tree as `<PageHubEditor />` (inside Craft `<Editor>`). */
export interface PageHubAiPanelContext {
  /** SDK event bus from `PageHub.init` / provider (structurally matches `EventEmitter`). */
  emitter: {
    on: (event: string, handler: (...args: any[]) => void) => () => void;
    emit: (event: string, ...args: any[]) => void;
  };
}

/** Host implements image AI — SDK calls these instead of hard-coded `/api/ai/image/*` fetches. */
export interface PageHubAiMediaHandlers {
  analyzeImage?: (args: {
    imageUrl: string;
    aiSettings: Record<string, unknown>;
  }) => Promise<{
    fileName?: string;
    altText?: string;
    seoDescription?: string;
  } | null>;

  generateImage?: (args: {
    prompt: string;
    width: number;
    height: number;
    model: string;
    aiSettings: Record<string, unknown>;
  }) => Promise<{
    success?: boolean;
    imageUrl?: string;
    optimizedPrompt?: string;
    claudeUsage?: unknown;
    error?: string;
  }>;
}

/**
 * Host-rendered AI affordances (same contract external integrators use).
 * When a slot is omitted, that control is not shown.
 */
export interface PageHubEditorChromeSlots {
  /** Toolbox tab strip — wand opens assistant (host typically uses `ClippyOpenAtom`). */
  renderToolboxAiButton?: () => ReactNode;
  /** Rich-text floating toolbar — host owns prompt UI and text-improve API. */
  renderTiptapAiToolbar?: (ctx: { editor: unknown; query: unknown }) => ReactNode;
  /** Settings sidebar “Edit with AI” (per selected node). */
  renderSettingsAiButton?: (ctx: { nodeId: string }) => ReactNode;
  /** Container / add-section wand — opens assistant in create mode. */
  renderNodeAiGenerateButton?: (ctx: {
    onClick: () => void;
    className?: string;
    disabled?: boolean;
  }) => ReactNode;
  /** Empty canvas “Build with AI” card. */
  renderEmptyStateAiCard?: (ctx: { onOpenAssistant: () => void }) => ReactNode;
  /** Editor nav menu row — AI Assistant + shortcut hint lives in host. */
  renderNavAiMenuItem?: (ctx: { onSelect: () => void }) => ReactNode;
}

// ─── Main configuration ──────────────────────────────────────────────────────

export interface PageHubConfig {
  /** DOM element or CSS selector to mount the editor into */
  container: HTMLElement | string;

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
  components?: import("./define").ResolvedComponentDef[];

  /**
   * Host-rendered docked panel (e.g. AI assistant). Shown when `features.aiGeneration` is true.
   * The SDK provides layout placement only; all product UI and API calls live in the host.
   */
  renderAiPanel?: (ctx: PageHubAiPanelContext) => ReactNode;

  /** Optional slots for AI (and auth-gated) chrome — implemented by the host app. */
  editorChromeSlots?: PageHubEditorChromeSlots;

  /** Optional image AI — when set, media manager uses these instead of SDK fetch calls. */
  aiMediaHandlers?: PageHubAiMediaHandlers;
}

// ─── Instance API — returned by PageHub.init() ───────────────────────────────

export interface PageHubInstance {
  /** Programmatically save the current editor state */
  save: (options?: { isDraft?: boolean }) => Promise<void>;

  /** Load a page into the editor */
  load: (pageId: string) => Promise<void>;

  /** Get the current page data without saving */
  getPageData: () => PageData;

  /** Switch between editor and viewer mode */
  setReadOnly: (readOnly: boolean) => void;

  /** Update theme at runtime */
  setTheme: (theme: Partial<PageHubTheme>) => void;

  /** Update feature flags at runtime */
  setFeatures: (features: Partial<PageHubFeatures>) => void;

  /** Destroy the editor and clean up DOM */
  destroy: () => void;

  /** Listen to SDK events */
  on: <E extends PageHubEvent>(event: E, handler: (...args: PageHubEventMap[E]) => void) => () => void;

  /** Get the rendered HTML string */
  getHTML: () => string;

  /** Serialise the current state to a JSON string (for export) */
  exportJSON: () => string;

  /** Import a previously exported JSON string */
  importJSON: (json: string) => void;

  /** Render the current editor state to static HTML + CSS class list */
  exportHTML: (options?: {
    view?: "desktop" | "mobile";
    document?: boolean;
    includeThemeVars?: boolean;
    title?: string;
    extraCSS?: string;
    extraHead?: string;
  }) => {
    html: string;
    classes: string[];
    fontUrls: string[];
    scrollObserverScript: string;
    renderError?: string;
  };
}

// ─── Events ───────────────────────────────────────────────────────────────────

export type PageHubEvent =
  | "ready"
  | "save"
  | "load"
  | "change"
  | "publish"
  | "error"
  | "modeChange"
  | "componentSelect"
  | "componentDeselect";

export interface PageHubEventMap {
  ready: [];
  save: [options?: { isDraft?: boolean }];
  load: [pageData: PageData];
  change: [];
  publish: [pageData: PageData];
  error: [error: unknown];
  modeChange: [mode: "editor" | "viewer"];
  componentSelect: [nodeId: string];
  componentDeselect: [];
}

// ─── Component registration ─────────────────────────────────────────────────
// Types re-exported from define.ts — the canonical definitions live there.
// This re-export keeps the types.ts barrel working for existing consumers.

export type { PageHubComponentDef, ResolvedComponentDef, PropSchema, ComponentPreset } from "./define";
