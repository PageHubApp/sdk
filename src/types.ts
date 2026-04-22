/**
 * @pagehub/sdk — Core type definitions
 *
 * These types define the public API surface of the SDK.
 * Customers implement callbacks; we provide the editor.
 */

import type { Dispatch, MouseEvent, ReactNode, SetStateAction, WheelEvent } from "react";

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
  /**
   * Per-page shard data for granular saves (Phase 5).
   * When present, the integration layer can use the per-page save endpoint
   * instead of the full-tree save.
   */
  shards?: {
    /** Compressed shared shard (ROOT + header + footer). Only present if shared nodes changed. */
    shared?: string;
    /** Compressed page shards, keyed by pageNodeId. Only dirty pages included. */
    pages: Record<string, string>;
    /** Which page node IDs are loaded in the editor (so server doesn't delete unloaded ones). */
    loadedPageIds: string[];
  };
}

/**
 * Page-level SEO metadata.
 *
 * Populated by the editor's SEO panel and included in `PageData.seo`.
 * Consumers should render these into `<head>` meta tags on the published page.
 *
 * - `title` — `<title>` and `og:title` fallback (50-60 chars recommended)
 * - `description` — `<meta name="description">` (~140 chars recommended)
 * - `keywords` — `<meta name="keywords">` (comma-separated)
 * - `ogTitle` — Open Graph title override
 * - `ogDescription` — Open Graph description override
 * - `ogImage` — Open Graph image URL (1200x630 recommended)
 * - `canonicalUrl` — `<link rel="canonical">` for deduplication
 * - `robots` — `<meta name="robots">` directives (e.g. "noindex, nofollow")
 */
export interface PageSeo {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  robots?: string;
  /** Structured data rendered as `<script type="application/ld+json">` (e.g. Organization / WebSite). */
  jsonLd?: Record<string, unknown>;
  /** Site favicon. ROOT-only — per-page favicon overrides fall back to ROOT. */
  favicon?: {
    /** Favicon href (URL or media library id). */
    href?: string;
    /** MIME type (e.g. "image/png", "image/svg+xml"). */
    type?: string;
    /** Inline SVG content when favicon is stored as SVG markup. */
    content?: string;
  };
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

  /**
   * Fetch a single page shard for lazy loading.
   * Called when the user switches to a page not yet in the CraftJS tree.
   * Return compressed assembled content (shared + page), or null if unavailable.
   * When omitted, SDK assumes all pages are in-tree (standalone mode).
   */
  fetchPage?: (pageNodeId: string) => Promise<{ content: string } | null>;

  /** Called when the user publishes (promotes draft → live). */
  onPublish?: (pageData: PageData) => Promise<void> | void;

  /** Called when media needs to be uploaded. Return the public URL. */
  onMediaUpload?: (file: File) => Promise<string>;

  /** Called when media should be deleted */
  onMediaDelete?: (url: string) => Promise<void>;

  /** Called when a user clicks an "Add to Cart" button. Item is the current repeater item context. */
  onAddToCart?: (item: Record<string, any>, quantity: number) => void;

  /**
   * Fetch page settings (props + metadata) for a page not currently in the CraftJS tree.
   * Called when opening the page settings modal for an unloaded page shard.
   * When omitted, settings are only readable for in-tree pages.
   */
  fetchPageSettings?: (pageNodeId: string) => Promise<PageSettingsPayload | null>;

  /**
   * Save page settings for a page not currently in the CraftJS tree.
   * Called when committing settings changes for an unloaded page shard.
   * When omitted, settings are only writable for in-tree pages.
   */
  savePageSettings?: (pageNodeId: string, settings: PageSettingsPayload) => Promise<void>;

  /**
   * Create a new page in the database (sharding mode).
   * Called instead of tree-first AddElement when fetchPage is available.
   */
  createPage?: (params: {
    pageNodeId: string;
    displayName: string;
    pageSlug?: string;
    pageTitle?: string;
    pageDescription?: string;
  }) => Promise<{ nodeId: string }>;
}

/** Shape exchanged between SDK and host for remote page settings. */
export interface PageSettingsPayload {
  displayName: string;
  isHomePage: boolean;
  is404Page: boolean;
  props: Record<string, any>;
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
  /** Allow marking a page as the site custom 404 canvas. Default: true (host can set false for free tier). */
  custom404Page?: boolean;
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

export interface PageHubMediaMetadataSuggestion {
  title?: string;
  alt?: string;
  description?: string;
}

export interface PageHubMediaManagerAiPanelContext {
  prompt: string;
  model: string;
  imagePreviewUrl: string | null;
  optimizedPrompt: string | null;
  usage: unknown;
  error: string;
  success: string;
  isGenerating: boolean;
  isSaving: boolean;
  imageScale: number;
  imagePosition: { x: number; y: number };
  isDragging: boolean;
  designNotes?: string;
  designTags?: string[];
  setPrompt: (value: string) => void;
  setModel: (value: string) => void;
  setGenerating: (value: boolean) => void;
  setError: (value: string) => void;
  setSuccess: (value: string) => void;
  setGeneratedImage: (args: {
    imageUrl: string | null;
    optimizedPrompt?: string | null;
    usage?: unknown;
  }) => void;
  saveGeneratedImage: () => Promise<void>;
  setImageScale: (value: number) => void;
  resetImageView: () => void;
  onImageMouseDown: (e: MouseEvent) => void;
  onImageMouseMove: (e: MouseEvent) => void;
  onImageMouseUp: () => void;
  onImageWheel: (e: WheelEvent) => void;
}

export interface PageHubMediaEditAiActionsContext {
  media: {
    id: string;
    type?: "cdn" | "url" | "svg" | "r2";
    cdnId?: string;
    metadata?: {
      title?: string;
      alt?: string;
      description?: string;
      url?: string;
      svg?: string;
      size?: number;
    };
  };
  imageUrl?: string;
  isGenerating: boolean;
  error: string;
  designNotes?: string;
  designTags?: string[];
  setGenerating: (value: boolean) => void;
  setError: (value: string) => void;
  applyMetadata: (metadata: PageHubMediaMetadataSuggestion) => void;
}

/**
 * Host-rendered AI affordances (same contract external integrators use).
 * When a slot is omitted, that control is not shown.
 */
export interface PageHubEditorChromeSlots {
  /** Toolbox tab strip — wand opens assistant (host typically uses `AssistantOpenAtom`). */
  renderToolboxAiButton?: () => ReactNode;
  /** Rich-text floating toolbar — opens assistant for copy (text scope). */
  renderInlineCopyAssistantTrigger?: (ctx: { textNodeId: string; query: unknown }) => ReactNode;
  /** Settings sidebar “Edit with AI” (per selected node). Host should pin `nodeId` to `AiChatAttachedNodesAtom` like “Add to context”. */
  renderSettingsAiButton?: (ctx: {
    nodeId: string;
    displayName: string;
    resolvedType?: string;
  }) => ReactNode;
  /** Data source settings for Container — filter, limit, sort, offset controls. Host-rendered. */
  renderDataSourceSection?: (ctx: { nodeId: string }) => ReactNode;
  /** Container / add-section wand — opens assistant in create mode. */
  renderNodeAiGenerateButton?: (ctx: {
    onClick: () => void;
    className?: string;
    disabled?: boolean;
  }) => ReactNode;
  /** Floating node chip — pin this element to AI chat context (deduped in `AiChatAttachedNodesAtom`). */
  renderNodeAiContextButton?: (ctx: {
    onClick: () => void;
    className?: string;
    disabled?: boolean;
    /** Wand + text row (e.g. canvas context menu); omit for icon-only chip. */
    label?: string;
    /** Forwarded to host button for `react-tooltip` / `PAGEHUB_RTT_GLOBAL_ID` surface. */
    "data-tooltip-id"?: string;
    "data-tooltip-content"?: string;
    "data-tooltip-place"?: string;
    "data-tooltip-offset"?: number | string;
  }) => ReactNode;
  /** Empty canvas “Build with AI” card. */
  renderEmptyStateAiCard?: (ctx: { onOpenAssistant: () => void }) => ReactNode;
  /** Editor nav menu row — AI Assistant + shortcut hint lives in host. */
  renderNavAiMenuItem?: (ctx: { onSelect: () => void }) => ReactNode;
  /** Top of editor nav — page-level actions (View Draft, Duplicate, Delete, etc.) from host. */
  renderNavHeaderItems?: (ctx: { close: () => void }) => ReactNode;
  /**
   * Host-only block in Import/Export → Export tab (e.g. static HTML ZIP). SDK does not call app APIs.
   */
  renderImportExportHandoffExtras?: () => ReactNode;
  /**
   * Media manager "Generate with AI" panel.
   * Host owns API calls/auth; SDK provides media state and save/apply callbacks.
   */
  renderMediaManagerAiPanel?: (ctx: PageHubMediaManagerAiPanelContext) => ReactNode;
  /**
   * Media edit modal AI metadata action block.
   * Host owns API calls/auth; SDK provides apply callback for metadata fields.
   */
  renderMediaEditAiActions?: (ctx: PageHubMediaEditAiActionsContext) => ReactNode;
  /**
   * Extra tabs injected into the Site Settings modal (e.g. Data Connectors).
   * Host owns all API calls, auth, and business logic; SDK provides the tab slot.
   */
  siteSettingsExtraTabs?: Array<{
    key: string;
    label: string;
    order?: number;
    render: (ctx: {
      inputClass: string;
      selectClass: string;
      query: any;
      actions: any;
      draft?: Record<string, any>;
      setDraft?: Dispatch<SetStateAction<Record<string, any>>>;
      requestSave?: () => void;
      flushSave?: () => void;
    }) => ReactNode;
    onSave?: (setProp: (cb: (props: any) => void) => void) => void;
  }>;
  /**
   * Extra tabs injected into the Page Settings modal.
   * Host owns all API calls, auth, and business logic; SDK provides the tab slot.
   */
  pageSettingsExtraTabs?: Array<{
    key: string;
    label: string;
    order?: number;
    render: (ctx: {
      inputClass: string;
      selectClass: string;
      query: any;
      actions: any;
      pageId: string | null;
      allowCustom404Page: boolean;
      draft?: Record<string, any>;
      setDraft?: Dispatch<SetStateAction<Record<string, any>>>;
      updateField?: (key: string, value: any) => void;
      requestSave?: () => void;
      flushSave?: () => void;
    }) => ReactNode;
    onSave?: (ctx: {
      pageId: string | null;
      setProp?: (cb: (props: any) => void) => void;
      draft?: Record<string, any>;
      query: any;
      actions: any;
    }) => void;
  }>;
}

// ─── Main configuration ──────────────────────────────────────────────────────

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
  components?: import("./define").ResolvedComponentDef[];

  /**
   * Host-rendered docked panel (e.g. AI assistant). Shown when `features.aiGeneration` is true.
   * The SDK provides layout placement only; all product UI and API calls live in the host.
   */
  renderAiPanel?: (ctx: PageHubAiPanelContext) => ReactNode;

  /** Optional slots for AI (and auth-gated) chrome — implemented by the host app. */
  editorChromeSlots?: PageHubEditorChromeSlots;

  /**
   * URL strategy for page navigation in the editor.
   * When provided, the SDK uses pushState/popstate to manage page URLs
   * (browser back/forward works). When omitted (standalone SDK),
   * page switching happens in-memory only.
   */
  urlStrategy?: import("./utils/pageNavigation").UrlStrategy;
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
  on: <E extends PageHubEvent>(
    event: E,
    handler: (...args: PageHubEventMap[E]) => void
  ) => () => void;

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
  | "componentDeselect"
  | "unsaved_changes";

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
  /** Emitted when dirty state toggles (editor tracks serialized graph when dirty). */
  unsaved_changes: [dirty: boolean];
}

// ─── Component registration ─────────────────────────────────────────────────
// Types re-exported from define.ts — the canonical definitions live there.
// This re-export keeps the types.ts barrel working for existing consumers.

export type {
  PageHubComponentDef,
  ResolvedComponentDef,
  PropSchema,
  ComponentPreset,
} from "./define";
