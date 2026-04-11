/**
 * @pagehub/sdk — Static HTML Renderer
 *
 * Generic tree walker that uses each component's .toHTML.ts file.
 * No React, no DOM, no browser — runs in Node, edge workers, or build scripts.
 *
 * Usage:
 * ```ts
 * import { renderToHTML } from '@pagehub/sdk/static';
 *
 * const { html, classes, fontUrls } = renderToHTML(compressedContent);
 * const { html } = renderToHTML(jsonString, { compressed: false });
 * ```
 */

import lz from "lzutf8";
import { escapeHTML } from "./utils/static-html";
import type { StaticRenderContext, ToHTMLFn } from "./utils/static-html";
import { processForStatic, type ResolvedComponentDef } from "./define";
import { toCSSVarName, toPaletteCSSVarName } from "./utils/design/designSystemVars";
import { resolveTheme } from "./utils/design/resolveTheme";
import { getMaterialSymbolsUrlFromNodes } from "./utils/data/collectGoogleIcons";

const TAILWIND_FONT_WEIGHT_CLASS =
  /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/i;

/** First loadable Google family from styleGuide.*Family (not Tailwind weight tokens like `font-bold`). */
function styleGuideGoogleFontFamily(raw: string | undefined | null): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  if (TAILWIND_FONT_WEIGHT_CLASS.test(t)) return null;
  const first = t.split(",")[0].trim();
  const stripped = first.replace(/^['"]+|['"]+$/g, "").trim();
  if (!stripped) return null;
  const generics = new Set([
    "sans-serif",
    "serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-sans-serif",
    "ui-serif",
    "ui-monospace",
  ]);
  if (generics.has(stripped.toLowerCase())) return null;
  if (stripped.includes("var(") || stripped.startsWith("--")) return null;
  return stripped;
}

/**
 * True when cached `preview.fontUrls` should be replaced (empty, or old renderer emitted
 * Tailwind weight classes as Google `family=` — e.g. `family=font-bold:wght@...`).
 */
export function cachedPreviewGoogleTextFontUrlsLookInvalid(urls: string[] | undefined | null): boolean {
  if (!Array.isArray(urls) || urls.length === 0) return true;
  for (const raw of urls) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    try {
      const u = new URL(raw.trim());
      if (u.hostname !== "fonts.googleapis.com" || !u.pathname.includes("css2")) continue;
      const fam = u.searchParams.get("family") || "";
      if (fam.includes("Material Symbols Outlined")) continue;
      const base = fam.split(":")[0].replace(/\+/g, " ").trim();
      if (TAILWIND_FONT_WEIGHT_CLASS.test(base)) return true;
    } catch {
      continue;
    }
  }
  return false;
}

// ─── IntersectionObserver for scroll-triggered CSS animations ──────────────
const PH_SCROLL_OBSERVER_SCRIPT = `<script>
(function(){
  if(!('IntersectionObserver' in window))return;
  var o=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        e.target.classList.add('ph-in-view');
        o.unobserve(e.target);
      }
    });
  },{threshold:0.1});
  document.querySelectorAll('.ph-anim-scroll').forEach(function(el){o.observe(el);});
})();
</script>`;

// ─── GSAP CDN (shared by horizontal-scroll + scroll-timeline) ───────────
const PH_GSAP_CDN = `<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js" defer></script>`;

// ─── Horizontal scroll ─────────────────────────────────────────────────
const PH_HORIZONTAL_SCROLL_SCRIPT = `<script>
document.addEventListener('DOMContentLoaded',function(){
  if(!window.gsap||!window.ScrollTrigger)return;
  gsap.registerPlugin(ScrollTrigger);
  document.querySelectorAll('[data-scroll-effect="horizontal-scroll"]').forEach(function(section){
    var sticky=section.querySelector('.ph-hscroll-sticky');
    var track=section.querySelector('.ph-hscroll-track');
    if(!sticky||!track)return;
    var overflow=track.scrollWidth-section.offsetWidth;
    if(overflow<=0)return;
    var dir=section.getAttribute('data-scroll-direction')||'ltr';
    var speed=parseFloat(section.getAttribute('data-scroll-speed')||'1.5');
    var smoothing=parseFloat(section.getAttribute('data-scroll-smoothing')||'0.8');
    var doSnap=section.getAttribute('data-scroll-snap')==='true';
    var isRTL=dir==='rtl';
    var panelCount=track.children.length;
    var snapVal=doSnap&&panelCount>1?{snapTo:1/(panelCount-1),duration:{min:0.2,max:0.5},ease:'power1.inOut'}:false;
    if(isRTL)gsap.set(track,{x:-overflow});
    gsap.timeline({
      scrollTrigger:{
        trigger:section,
        pin:sticky,
        scrub:smoothing,
        end:'+='+(overflow*speed),
        snap:snapVal,
        pinSpacing:true,
        anticipatePin:1,
        invalidateOnRefresh:true
      }
    }).to(track,{x:isRTL?0:-overflow,ease:'none'});
  });
});
</script>`;

// ─── Scroll timeline ────────────────────────────────────────────────────
const PH_SCROLL_TIMELINE_SCRIPT = `<script>
document.addEventListener('DOMContentLoaded',function(){
  if(!window.gsap||!window.ScrollTrigger)return;
  gsap.registerPlugin(ScrollTrigger);
  var presets={
    fadeIn:{from:{opacity:0},to:{opacity:1}},
    fadeOut:{from:{opacity:1},to:{opacity:0}},
    scaleUp:{from:{scale:0.3,opacity:0},to:{scale:1,opacity:1}},
    slideLeft:{from:{x:200,opacity:0},to:{x:0,opacity:1}},
    slideRight:{from:{x:-200,opacity:0},to:{x:0,opacity:1}},
    slideUp:{from:{y:100,opacity:0},to:{y:0,opacity:1}},
    slideDown:{from:{y:-100,opacity:0},to:{y:0,opacity:1}},
    rotateIn:{from:{rotation:15,opacity:0},to:{rotation:0,opacity:1}},
    fadeScale:{from:{scale:0.5,opacity:0,filter:'blur(8px)'},to:{scale:1,opacity:1,filter:'blur(0px)'}},
    slideRotate:{from:{x:200,rotation:-15,opacity:0},to:{x:0,rotation:0,opacity:1}}
  };
  document.querySelectorAll('[data-scroll-effect="scroll-timeline"]').forEach(function(section){
    var runway=parseFloat(section.getAttribute('data-scroll-runway')||'3');
    var smoothing=parseFloat(section.getAttribute('data-scroll-smoothing')||'0.8');
    var children=section.querySelectorAll('[data-scroll-timeline]');
    if(!children.length)return;
    var tl=gsap.timeline({
      scrollTrigger:{
        trigger:section,pin:true,scrub:smoothing,
        end:'+='+(window.innerHeight*runway),
        pinSpacing:true,anticipatePin:1,invalidateOnRefresh:true
      }
    });
    children.forEach(function(child){
      try{
        var cfg=JSON.parse(child.getAttribute('data-scroll-timeline'));
        var p=presets[cfg.preset];
        if(!p)return;
        var start=(cfg.startProgress||0)/100;
        var end=(cfg.endProgress||100)/100;
        var dur=Math.max(0.01,end-start);
        gsap.set(child,p.from);
        tl.to(child,Object.assign({},p.to,{duration:dur,ease:'none'}),start);
      }catch(e){}
    });
  });
});
</script>`;

import { BUILTIN_COMPONENT_DEFS } from "./builtins";

// Header/Footer reuse Container's toHTML
import { toHTML as containerToHTML } from "./components/Container.craft";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SerializedNode {
  type: { resolvedName: string } | string;
  isCanvas?: boolean;
  props: Record<string, any>;
  parent: string | null;
  nodes: string[];
  linkedNodes?: Record<string, string>;
  hidden?: boolean;
}

type SerializedNodes = Record<string, SerializedNode>;

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
  /**
   * Set when the tree cannot be rendered (e.g. missing ROOT). Callers should show this
   * to users instead of treating render output as valid static HTML.
   */
  renderError?: string;
}

/** User-facing copy when serialized data has no ROOT / invalid shape (also logged as warning). */
export const RENDER_INVALID_TREE_MESSAGE =
  "This page could not be turned into static HTML because the document is incomplete or invalid. Your draft can still be saved; try starting from a template or contact support if this keeps happening.";

// ─── Default resolver ───────────────────────────────────────────────────────

const defaultResolver: Record<string, ToHTMLFn> = {
  ...processForStatic(BUILTIN_COMPONENT_DEFS),
  Header: containerToHTML,
  Footer: containerToHTML,
};

// ─── Tree walker ────────────────────────────────────────────────────────────

function resolveType(node: SerializedNode): string {
  if (typeof node.type === "string") return node.type;
  return node.type?.resolvedName || "Container";
}

function renderNode(
  nodeId: string,
  nodes: SerializedNodes,
  resolver: Record<string, ToHTMLFn>,
  ctx: StaticRenderContext,
): string {
  const node = nodes[nodeId];
  if (!node || node.hidden) return "";

  const typeName = resolveType(node);
  const toHTML = resolver[typeName];

  // Render children + linked nodes
  const childIds = [
    ...(node.nodes || []),
    ...Object.values(node.linkedNodes || {}),
  ];
  const childrenHTML = childIds
    .map(id => renderNode(id as string, nodes, resolver, ctx))
    .filter(Boolean)
    .join("\n");

  if (toHTML) {
    return toHTML(node.props || {}, childrenHTML, ctx);
  }

  // Fallback: unknown component
  console.warn(`[renderToHTML] No .toHTML.ts for "${typeName}" — rendering children as <div>`);
  return childrenHTML ? `<div>${childrenHTML}</div>` : "";
}

function renderInvalidTreeResult(
  opts: Pick<
    RenderToHTMLOptions,
    "document" | "includeThemeVars" | "title" | "extraCSS" | "extraHead"
  >,
): RenderToHTMLResult {
  const {
    document: wrapDocument = false,
    includeThemeVars = true,
    title = "",
    extraCSS = "",
    extraHead = "",
  } = opts;
  console.warn("[renderToHTML]", RENDER_INVALID_TREE_MESSAGE);
  const scrollObserverScript = "";
  const renderError = RENDER_INVALID_TREE_MESSAGE;
  if (wrapDocument) {
    const themeVars = includeThemeVars ? generateThemeVars({}) : "";
    const doc = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHTML(title)}</title>
    ${extraHead}
    <style>
${themeVars}
${extraCSS}
    </style>
</head>
<body>

${scrollObserverScript}
</body>
</html>`;
    return { html: doc, classes: [], fontUrls: [], scrollObserverScript, renderError };
  }
  return { html: "", classes: [], fontUrls: [], scrollObserverScript, renderError };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function renderToHTML(
  content: string,
  options: RenderToHTMLOptions = {},
): RenderToHTMLResult {
  const {
    compressed = true,
    view = "desktop",
    palette = [],
    document: wrapDocument = false,
    includeThemeVars = true,
    title = "",
    extraCSS = "",
    extraHead = "",
    resolver: extraResolver = {},
    components: componentDefs = [],
  } = options;

  // 1. Decompress
  let json: string;
  if (compressed) {
    json = lz.decompress(lz.decodeBase64(content));
  } else {
    json = content;
  }

  // 2. Parse
  let nodes: SerializedNodes;
  try {
    nodes = typeof json === "string" ? JSON.parse(json) : json;
  } catch (err) {
    throw new Error(`[renderToHTML] Failed to parse node tree: ${err}`);
  }

  if (
    !nodes ||
    typeof nodes !== "object" ||
    Array.isArray(nodes) ||
    !nodes["ROOT"]
  ) {
    return renderInvalidTreeResult({
      document: wrapDocument,
      includeThemeVars,
      title,
      extraCSS,
      extraHead,
    });
  }

  // 3. Auto-detect palette from ROOT
  let resolvedPalette = palette;
  if (resolvedPalette.length === 0) {
    resolvedPalette = resolveTheme(nodes["ROOT"]?.props || {}).palette;
  }

  // 4. Merge resolver (built-in + defineComponent + manual overrides)
  const customToHTML = componentDefs.length > 0 ? processForStatic(componentDefs) : {};
  const resolver = { ...defaultResolver, ...customToHTML, ...extraResolver };

  // 5. Build context
  const ctx: StaticRenderContext = {
    nodes,
    view,
    palette: resolvedPalette,
    classes: new Set<string>(),
    fontUrls: new Set<string>(),
    renderChildren: (nodeIds: string[]) =>
      nodeIds
        .map(id => renderNode(id, nodes, resolver, ctx))
        .filter(Boolean)
        .join("\n"),
  };

  // 6. Render from ROOT
  const html = renderNode("ROOT", nodes, resolver, ctx);

  // 7. Collect font URLs (real families live in *FontFamily — headingFont/bodyFont are weight classes)
  const rootProps = nodes["ROOT"]?.props || {};
  const sg = resolveTheme(rootProps).styleGuide;
  for (const fontKey of ["headingFontFamily", "bodyFontFamily"] as const) {
    const font = styleGuideGoogleFontFamily(sg[fontKey]);
    if (font) {
      ctx.fontUrls.add(
        `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@300;400;500;600;700&display=swap`
      );
    }
  }

  try {
    const ms = getMaterialSymbolsUrlFromNodes(nodes);
    if (ms) ctx.fontUrls.add(ms);
  } catch {
    /* ignore */
  }

  // 8. Detect if scroll observer / GSAP scripts are needed
  const needsScrollObserver = ctx.classes.has("ph-anim-scroll");
  const needsHorizontalScroll = ctx.classes.has("ph-hscroll");
  const needsScrollTimeline = ctx.classes.has("ph-scroll-timeline");
  const needsGSAP = needsHorizontalScroll || needsScrollTimeline;
  const scrollObserverScript =
    (needsScrollObserver ? PH_SCROLL_OBSERVER_SCRIPT : "") +
    (needsGSAP ? PH_GSAP_CDN : "") +
    (needsHorizontalScroll ? PH_HORIZONTAL_SCROLL_SCRIPT : "") +
    (needsScrollTimeline ? PH_SCROLL_TIMELINE_SCRIPT : "");

  // 9. Wrap in document
  if (wrapDocument) {
    const fontLinks = [...ctx.fontUrls]
      .map(url => `<link rel="stylesheet" href="${url}" />`)
      .join("\n    ");
    const themeVars = includeThemeVars ? generateThemeVars(rootProps) : "";

    const doc = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHTML(title || rootProps.pageTitle || "")}</title>
    ${fontLinks}
    ${extraHead}
    <style>
${themeVars}
${extraCSS}
    </style>
</head>
<body>
${html}
${scrollObserverScript}
</body>
</html>`;

    return { html: doc, classes: [...ctx.classes], fontUrls: [...ctx.fontUrls], scrollObserverScript };
  }

  return { html, classes: [...ctx.classes], fontUrls: [...ctx.fontUrls], scrollObserverScript };
}

// ─── Theme CSS variables ────────────────────────────────────────────────────

function generateThemeVars(rootProps: Record<string, any>): string {
  const theme = resolveTheme(rootProps);
  const sg = theme.styleGuide;
  const palette = theme.palette;

  const paletteVars = palette
    .filter((p: any) => p.name && p.color)
    .map((p: any) => `  ${toPaletteCSSVarName(p.name)}: ${p.color};`)
    .join("\n");

  const dsVars = [
    sg.borderRadius && `  --radius: ${sg.borderRadius};`,
    sg.buttonPadding && `  --button-padding: ${sg.buttonPadding};`,
    sg.containerPadding && `  --container-padding: ${sg.containerPadding};`,
    sg.sectionGap && `  --section-gap: ${sg.sectionGap};`,
    sg.containerGap && `  --container-gap: ${sg.containerGap};`,
    sg.contentWidth && `  --content-width: ${sg.contentWidth};`,
    sg.headingFontFamily && `  --font-sans: ${sg.headingFontFamily};`,
    sg.bodyFontFamily && `  --font-serif: ${sg.bodyFontFamily};`,
    sg.inputBorderWidth && `  --input-border-width: ${sg.inputBorderWidth};`,
    sg.inputBorderColor && `  --input-border-color: ${sg.inputBorderColor};`,
    sg.inputBorderRadius && `  --input-border-radius: ${sg.inputBorderRadius};`,
    sg.inputPadding && `  --input-padding: ${sg.inputPadding};`,
    sg.inputBgColor && `  --input-bg-color: ${sg.inputBgColor};`,
    sg.inputTextColor && `  --input-text-color: ${sg.inputTextColor};`,
    sg.inputPlaceholderColor && `  --input-placeholder-color: ${sg.inputPlaceholderColor};`,
    sg.inputFocusRing && `  --input-focus-ring: ${sg.inputFocusRing};`,
    sg.inputFocusRingColor && `  --input-focus-ring-color: ${sg.inputFocusRingColor};`,
  ].filter(Boolean).join("\n");

  return `:root {\n${paletteVars}\n${dsVars}\n}`;
}

/** `:root { … }` from ROOT/Background theme (palette + styleGuide) for static hand-off zips. */
export function buildRootThemeCss(rootProps: Record<string, any>): string {
  return generateThemeVars(rootProps);
}

// Re-export types
export type { StaticRenderContext, ToHTMLFn } from "./utils/static-html";
