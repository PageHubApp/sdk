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
  /**
   * Show the design-system / theme panel (palette, typography, spacing tokens
   * editable on ROOT). Default: true. Hosts whose backing model doesn't
   * represent CraftJS theme state — Avocado's `update_site_config` covers
   * name/logo/nav only, not palette/fonts — should hide it so silent token
   * edits don't accumulate on the canvas.
   */
  designSystem?: boolean;
  /**
   * Show the Media Manager (asset library: upload, browse, edit, AI-describe).
   * Default: true. Hosts that own asset storage outside PageHub's `/api/media/*`
   * surface (e.g. Avocado, which has no MediaRecord model) should hide it so
   * users don't upload into a black hole.
   */
  mediaManager?: boolean;
  /**
   * Show the Modifiers modal + topbar entry (Tailwind class-toggle catalog).
   * Default: true. Modifier toggles emit `className` patches; hosts whose
   * blocks don't accept arbitrary `className` (Avocado's `BlockInstance` schema
   * doesn't model it) should hide them — toggles would either be silently
   * rejected by the server or no-op on the renderer.
   */
  modifiers?: boolean;
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
  /** Show the save/publish button in the top toolbar. Default: true */
  saveButton?: boolean;
  /** Show the "Left/Right Settings Panel" toggle in the More menu. Default: true */
  settingsPanelSwitcher?: boolean;
  /** Show the "Switch to Dark/Light Theme" toggle in the More menu. Default: true */
  darkModeSwitcher?: boolean;
  /**
   * Blocks panel config. Object (not boolean) so future block-related settings
   * can land here without another flag rename. Omit to keep stock behavior.
   * See docs/sdk/host-constraints.md.
   */
  blocksPanel?: BlocksPanelFeature;
  /**
   * Per-component allowlist of inspector tabs. Omit a component to keep all tabs.
   * Tab names: "component" | "layout" | "design" | "interactions" | "advanced".
   * See docs/sdk/host-constraints.md.
   */
  inspectorTabs?: Partial<Record<string, InspectorTabName[]>>;
  /**
   * Filter classNames + inline style props at the input boundary. Used for
   * constrained editor modes (e.g. email) where the output can't support all CSS.
   * See docs/sdk/host-constraints.md.
   */
  cssAllowlist?: CssAllowlistFeature;
}

/** Inspector tab name — kept as string union here to avoid import cycle with the inspector registry. */
export type InspectorTabName =
  | "component"
  | "layout"
  | "design"
  | "interactions"
  | "advanced";

export interface BlocksPanelFeature {
  /** Show the Blocks tab in the toolbox. Default: true */
  enabled?: boolean;
}

export interface CssAllowlistFeature {
  /** A class is allowed if at least one regex matches its full token. */
  classes?: RegExp[];
  /** Whitelist of inline style property names (kebab-case as they appear in CSS). */
  properties?: string[];
}
