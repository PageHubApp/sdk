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
  /** Raw JSON-LD object, rendered alongside `schema` as a single extra `<script type="application/ld+json">`. */
  jsonLd?: Record<string, unknown>;
  /** Structured JSON-LD entries from the Schema builder. Each entry renders as one `<script type="application/ld+json">`. */
  schema?: Array<Record<string, unknown>>;
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
