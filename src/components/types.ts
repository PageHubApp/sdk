/**
 * @pagehub/sdk — Shared selector types
 *
 * Extracted from components/selectors/index.ts (main app).
 * These are the base interfaces that ALL selector components implement.
 */

/** @deprecated Style props are now className tokens. Kept for hover pseudo-state typing. */
export interface BaseStyleProps {
  flexDirection?: string;
  flexBase?: string;
  alignItems?: string;
  justifyContent?: string;
  flexGrow?: string;
  width?: string;
  maxWidth?: string;
  maxHeight?: string;
  minWidth?: string;
  minHeight?: string;
  lineHeight?: string;
  tracking?: string;
  height?: string;
  p?: string;
  m?: string;
  px?: string;
  py?: string;
  mx?: string;
  my?: string;
  ml?: string;
  mt?: string;
  mr?: string;
  mb?: string;
  marginTop?: string;
  pl?: string;
  pr?: string;
  pt?: string;
  pb?: string;
  display?: string;
  gap?: string;
  fontSize?: string;
  fontWeight?: string;
  objectFit?: string;
  aspectRatio?: string;
  transform?: string;
  wordBreak?: string;
  textOverflow?: string;
  indent?: string;
  textDecoration?: string;
  textAlign?: string;
  backgroundRepeat?: string;
  backgroundSize?: string;
  backgroundAttachment?: string;
  backgroundOrigin?: string;
  backgroundPosition?: string;
  overflow?: string;
  cursor?: string;
  position?: string;
  inset?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: string;
}

export const RootClassGenProps = [];

export interface RootStyleProps {
  style?: string;
  animation?: string;
  animationDuration?: string;
  animationDelay?: string;
  animationEasing?: string;
  animationTrigger?: string;
  animationCSSName?: string;
  pattern?: any;
  patternVerticalPosition?: string;
  patternHorizontalPosition?: string;
  patternStroke?: string;
  patternZoom?: string;
  patternColorA?: string;
  patternAngle?: string;
  patternColorB?: string;
  patternSpacingX?: string;
  patternSpacingY?: string;
  preset?: string;
  presetPadding?: string;
  presetMaxWidth?: string;
}

export interface BaseSelectorProps {
  /** Relationship graph for linked component instances. See {@link RelationProps}. */
  relation?: RelationProps;
  url?: string;
  urlTarget?: string;
  className?: string;
  tools?: any;

  root?: RootStyleProps;
  hover?: BaseStyleProps;
  activeTab?: number;
  children?: React.ReactNode;
  type?: string;
  custom?: object;
  displayName?: string;
  canDelete?: boolean;
  canEditName?: boolean;
  /** Background image configuration. See {@link BackgroundProps}. */
  background?: BackgroundProps;
}

/**
 * Named color — used by the palette system.
 */
export interface NamedColor {
  name: string;
  color: string;
}

// ─── Nested prop namespaces ───────────────────────────────────────────────────
// Typed shapes for PageHub-specific prop clusters. Native HTML/React props
// (loading, fetchPriority, aria-*, role, id, etc.) stay flat on the node;
// PageHub-specific clusters live under these namespaces.

/**
 * Background image configuration — render a background image on any node.
 * Applied to Background (ROOT), Container, ContainerGroup, Header, Footer,
 * Nav, Button, Text, Image. CSS positioning (cover/center/repeat) is handled
 * via className utilities (`bg-cover bg-center bg-no-repeat`).
 */
export interface BackgroundProps {
  /** Image URL or media library id (resolved via pageMedia when imageType === "cdn"). */
  image?: string;
  /** Source type for the image. */
  imageType?: "cdn" | "url" | "upload" | "svg";
  /** Loading priority hint. Display-only convention; `fetchPriority` drives the DOM attribute. */
  priority?: "high" | "low" | "auto";
  /** Maps to native `fetchpriority` on the rendered <img>/preload link. */
  fetchPriority?: "high" | "low" | "auto" | "";
  /** Defer until in viewport (maps to `loading="lazy"` on preload fallback). */
  lazy?: boolean;
  /** Low-res placeholder (blurhash / base64) shown while the full image loads. */
  placeholder?: string;
}

/**
 * Pointer-drag horizontal scroll UX for Container. Emits `data-ph-overflow-*`
 * data attributes that the runtime script reads to wire event listeners.
 */
export interface OverflowProps {
  /** Enable pointer-drag horizontal scrolling on published/preview (not in editor). */
  dragScroll?: boolean;
  /** 0 = 1:1 with pointer. 0.12–0.28 eases toward the target each frame (fluid). */
  smoothing?: number;
  /** Hide native scrollbar; show an auto-hiding custom thumb. */
  autoHide?: boolean;
  /** Map vertical wheel to scrollLeft when dragScroll is on. Default true. */
  wheelHorizontal?: boolean;
  /** Milliseconds before hiding the custom scrollbar thumb (auto-hide mode). */
  hideDelay?: number;
}

/**
 * Persisted design intent on Background (ROOT). Used by AI to ground edits
 * against the site's established vibe. Not rendered on the published page.
 */
export interface DesignProps {
  /** Prose design intent (editor only; ~1200 char cap in product UI). */
  notes?: string;
  /** Vibe/style tags for AI context. */
  tags?: string[];
}

/**
 * Raw HTML injection points on Background (ROOT). Renders verbatim into the
 * document head / before </body>. Named to disambiguate from the Header/Footer
 * CraftJS components.
 */
export interface InjectProps {
  /** HTML injected in <head>. */
  head?: string;
  /** HTML injected before </body>. */
  footer?: string;
}

/**
 * Data relationship hints on Container. Used by legacy data-binding paths.
 */
export interface RelationProps {
  belongsTo?: string;
  hasMany?: string[];
  relationType?: string;
}

/**
 * TipTap rich-text configuration on Text nodes.
 */
export interface RichTextProps {
  /** "full" = block-level (wrapping <p>), "inline" = inline-only (no wrapping). */
  mode?: "full" | "inline";
  /** Named profile selecting available marks/extensions. */
  profile?: string;
}
