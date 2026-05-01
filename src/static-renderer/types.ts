import type { ResolvedComponentDef } from "../define";
import type { ToHTMLFn } from "../utils/staticHtml";

export interface SerializedNode {
  type: { resolvedName: string } | string;
  isCanvas?: boolean;
  props: Record<string, any>;
  parent: string | null;
  nodes: string[];
  linkedNodes?: Record<string, string>;
  hidden?: boolean;
}

export type SerializedNodes = Record<string, SerializedNode>;

export interface RenderToHTMLOptions {
  /** If true (default), content is lz-compressed base64. If false, raw JSON. */
  compressed?: boolean;
  /** Viewport: "desktop" includes md: prefixes, "mobile" strips them. Default: "desktop" */
  view?: "desktop" | "mobile";
  /** Palette colors. Auto-detected from ROOT if not provided. */
  palette?: Array<{ name: string; color: string }>;
  /** Wrap output in a full HTML document. Default: false */
  document?: boolean;
  /** Include theme CSS variables in document mode. Default: true */
  includeThemeVars?: boolean;
  /** Page title for document mode */
  title?: string;
  /** Additional CSS to include */
  extraCSS?: string;
  /** Additional HTML for document head */
  extraHead?: string;
  /** Extra component toHTML functions — merged into default resolver */
  resolver?: Record<string, ToHTMLFn>;
  /** Custom components registered via defineComponent() */
  components?: ResolvedComponentDef[];
  /** Replace DaisyUI/spatial classes with pure Tailwind equivalents in output */
  pureTailwind?: boolean;
  /** Server-fetched connector data — resolves connector-backed conditions at SSR
   *  instead of wrapping them for the client-only reveal script. */
  connectorData?: Record<string, { bindings: Record<string, any[]> }> | null;
}

export interface RenderToHTMLResult {
  /** Rendered HTML fragment (or full document if options.document) */
  html: string;
  /** All Tailwind classes used, for CSS compilation */
  classes: string[];
  /** Google Font URLs needed */
  fontUrls: string[];
  /** Script tag for CSS scroll animations (non-empty if ph-anim-scroll classes are used) */
  scrollObserverScript: string;
  /** Design system CSS variables (:root block) — palette colors, spacing, fonts */
  themeCSS: string;
  /** Per-site breakpoint overrides from ROOT.props.theme.breakpoints (undefined = defaults). */
  breakpoints?: Record<string, number>;
  /** SEO metadata extracted from ROOT props */
  seo: {
    title: string;
    description: string;
    ogImage?: string;
    jsonLd?: object;
  } | null;
  /**
   * Set when the tree cannot be rendered (e.g. missing ROOT). Callers should show this
   * to users instead of treating render output as valid static HTML.
   */
  renderError?: string;
}

/** User-facing copy when serialized data has no ROOT / invalid shape (also logged as warning). */
export const RENDER_INVALID_TREE_MESSAGE =
  "This page could not be turned into static HTML because the document is incomplete or invalid. Your draft can still be saved; try starting from a template or contact support if this keeps happening.";
