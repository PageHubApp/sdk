import lz from "lzutf8";
import { getLoadActionScript } from "../utils/actions/load";
import { getConditionEvalScript } from "../utils/conditions/clientScript";
import { resolveTheme } from "../utils/design/resolveTheme";
import { collectIconRefs } from "../utils/icons/collectIconRefs";
import { preloadIcons } from "../utils/icons/serverResolve";
import { escapeHTML } from "../utils/staticHtml";
import type { StaticRenderContext } from "../utils/staticHtml";
import { processForStatic } from "../define/processors/forStatic";
import { styleGuideGoogleFontFamily } from "./fonts";
import { defaultResolver } from "./resolver";
import { PH_GSAP_CDN } from "./runtime/gsapCdn";
import { PH_HORIZONTAL_SCROLL_SCRIPT } from "./runtime/horizontalScroll";
import { PH_SCROLL_OBSERVER_SCRIPT } from "./runtime/intersectionObserver";
import { PH_OVERFLOW_SITE_SCRIPT } from "./runtime/overflowUx";
import { PH_SCROLL_TIMELINE_SCRIPT } from "./runtime/scrollTimeline";
import { generateThemeVars } from "./themeCss";
import {
  RENDER_INVALID_TREE_MESSAGE,
  type RenderToHTMLOptions,
  type RenderToHTMLResult,
  type SerializedNodes,
} from "./types";
import { renderNode } from "./walker";

function renderInvalidTreeResult(
  opts: Pick<
    RenderToHTMLOptions,
    "document" | "includeThemeVars" | "title" | "extraCSS" | "extraHead"
  >
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
    return {
      html: doc,
      classes: [],
      fontUrls: [],
      scrollObserverScript,
      themeCSS: themeVars,
      seo: null,
      renderError,
    };
  }
  return {
    html: "",
    classes: [],
    fontUrls: [],
    scrollObserverScript,
    themeCSS: "",
    seo: null,
    renderError,
  };
}

export function renderToHTML(
  content: string,
  options: RenderToHTMLOptions = {}
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
    pureTailwind = false,
    connectorData = null,
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

  if (!nodes || typeof nodes !== "object" || Array.isArray(nodes) || !nodes["ROOT"]) {
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
    pureTailwind,
    connectorData,
  };

  // 5a. Preload referenced icon SVGs so Button.craft / ListItem.craft can
  // resolve them via resolveIconSvgSync. preloadIcons uses sync fs reads
  // internally, so cache population completes synchronously.
  try {
    const refs = collectIconRefs(nodes as any);
    if (refs.length) void preloadIcons(refs);
  } catch {
    /* ignore */
  }

  // 6. Render from ROOT
  const html = renderNode("ROOT", nodes, resolver, ctx);

  // 7. Collect font URLs (Heading/Body fonts now live in theme.typography[])
  const rootProps = nodes["ROOT"]?.props || {};
  const theme = resolveTheme(rootProps);
  const headingTok = (theme.typography || []).find((t: any) => t?.name === "Heading");
  const bodyTok = (theme.typography || []).find((t: any) => t?.name === "Body");
  for (const tok of [headingTok, bodyTok]) {
    const font = styleGuideGoogleFontFamily(tok?.fontFamily);
    if (font) {
      ctx.fontUrls.add(
        `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@300;400;500;600;700&display=swap`
      );
    }
  }

  // 8. Compute theme CSS and SEO data
  const themeCSS = generateThemeVars(rootProps);

  const rootSeo = rootProps.seo || {};
  const seoTitle = rootSeo.title || rootProps.title || "";
  const seoDescription = rootSeo.description || rootProps.description || "";
  const seo =
    seoTitle || seoDescription || rootSeo.ogImage || rootSeo.jsonLd
      ? {
          title: seoTitle,
          description: seoDescription,
          ...(rootSeo.ogImage ? { ogImage: rootSeo.ogImage } : {}),
          ...(rootSeo.jsonLd ? { jsonLd: rootSeo.jsonLd } : {}),
        }
      : null;

  // 9. Detect if scroll observer / GSAP scripts are needed
  const needsScrollObserver = ctx.classes.has("ph-anim-scroll");
  const needsHorizontalScroll = ctx.classes.has("ph-hscroll");
  const needsScrollTimeline = ctx.classes.has("ph-scroll-timeline");
  const needsOverflowSite = ctx.classes.has("ph-overflow-site");
  const needsGSAP = needsHorizontalScroll || needsScrollTimeline;
  const scrollObserverScript =
    (needsScrollObserver ? PH_SCROLL_OBSERVER_SCRIPT : "") +
    (needsGSAP ? PH_GSAP_CDN : "") +
    (needsHorizontalScroll ? PH_HORIZONTAL_SCROLL_SCRIPT : "") +
    (needsScrollTimeline ? PH_SCROLL_TIMELINE_SCRIPT : "") +
    (needsOverflowSite ? PH_OVERFLOW_SITE_SCRIPT : "") +
    // Load-action script also bootstraps `window.__PH_STATE__` so the
    // condition evaluator's `state` branch can read it. Emit whenever
    // either load-actions OR client-side conditions exist.
    (ctx.hasLoadActions || ctx.hasClientConditions
      ? getLoadActionScript({ mobileBreakpoint: rootProps.theme?.breakpoints?.md })
      : "") +
    (ctx.hasClientConditions
      ? getConditionEvalScript({ mobileBreakpoint: rootProps.theme?.breakpoints?.md })
      : "");

  // 10. Wrap in document
  if (wrapDocument) {
    const fontLinks = [...ctx.fontUrls]
      .map(url => `<link rel="stylesheet" href="${url}" />`)
      .join("\n    ");
    const themeVars = includeThemeVars ? themeCSS : "";

    const doc = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHTML(title || rootProps.seo?.title || "")}</title>
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

    return {
      html: doc,
      classes: [...ctx.classes],
      fontUrls: [...ctx.fontUrls],
      scrollObserverScript,
      themeCSS,
      breakpoints: rootProps.theme?.breakpoints || undefined,
      seo,
    };
  }

  return {
    html,
    classes: [...ctx.classes],
    fontUrls: [...ctx.fontUrls],
    scrollObserverScript,
    themeCSS,
    breakpoints: rootProps.theme?.breakpoints || undefined,
    seo,
  };
}
