// ── SSR Tailwind + DaisyUI pipeline — public API ───────────────────────────
//
// The orchestration layer: scan a Craft tree → compile utilities → load + prune
// DaisyUI components → unwrap layers → rewrite breakpoints → strip unused
// keyframes → minify → prepend theme vars.

import { renderToHTML } from "../render/static/renderToHTML";
import { compileSchema, normalizeJsonLd } from "../utils/seo/compileSchema";
import type { SchemaEntry } from "../utils/seo/schemaTypes";
import { sdkLog } from "../utils/logger";
import { applyBreakpointRewrite } from "../utils/breakpointRewrite";
import { collectDaisyUICSS } from "./daisyui/loader";
import { purgeDaisyUIRules } from "./daisyui/purgeRules";
import { unwrapLayerBlocks } from "./transforms/unwrapLayers";
import { stripUnusedKeyframes } from "./transforms/stripKeyframes";
import { minifyCSS } from "./transforms/minify";
import { getCompiler } from "./compiler";
import { extractCandidatesFromNodes } from "./candidates";

/**
 * Compile Tailwind CSS for a set of class candidates.
 * Server-side only — requires Node.js (uses @tailwindcss/node and fs).
 *
 * @param options.classes - Tailwind class candidates (from renderToHTML().classes)
 * @param options.themeCSS - Optional theme CSS variables (from renderToHTML().themeCSS)
 * @param options.lean - Strip unused @keyframes and skip spotlight presets (for standalone exports)
 * @returns Compiled, minified CSS string
 */
export async function compileCSS(options: {
  classes: string[];
  themeCSS?: string;
  /** Raw Craft.js node map — used to expand modifier names during candidate extraction */
  nodes?: Record<string, any>;
  /** Strip unused @keyframes and skip spotlight presets (for standalone exports) */
  lean?: boolean;
  /**
   * Per-site breakpoint overrides (px). When provided and non-default, the compiled
   * output's `@media (width >= …)` thresholds (Tailwind + DaisyUI) are rewritten in
   * place via `applyBreakpointRewrite`.
   */
  breakpoints?: Record<string, number>;
  /**
   * Editor mode (Phase 3). When true, ALSO rewrites `@media` → `@container
   * ph-editor-canvas` so the editor canvas responds to its own width and
   * side-by-side mirror frames can show different bps simultaneously.
   *
   * MUST be false (or omitted) for /view, /static, custom domains — public
   * renders need real `@media` to respond to the browser viewport.
   */
  editor?: boolean;
}): Promise<string> {
  const { classes, themeCSS, lean = false, breakpoints, editor = false } = options;

  if (classes.length === 0) return themeCSS || "";

  // Collect DaisyUI component CSS for used classes
  const daisyuiCSS = collectDaisyUICSS(classes);

  // Compile Tailwind utilities
  const compiler = await getCompiler();
  const css = compiler.build(classes);

  // Keep Tailwind's preflight intact — `unwrapLayerBlocks` below flattens the
  // `@layer base { … }` block so it ships as plain CSS in the static export
  // (no host preflight to rely on). For host-embedded paths (/view, /static
  // React, /build) the host's own globals.css ships preflight too — the
  // duplicate rules are byte-bloat but byte-for-byte identical, so they're
  // harmless. The previous approach (strip + manually re-emit a curated
  // subset) silently lost rules every time Tailwind preflight grew, and was
  // the source of the link-color, heading-size, and list-bullet regressions.
  let stripped = css.replace(/@layer\s+[^{]+;/g, "");
  stripped = unwrapLayerBlocks(stripped);

  // Prepend DaisyUI CSS (unwrapped, with --color-* remapped, pruned to used selectors)
  if (daisyuiCSS) {
    let daisyStripped = daisyuiCSS.replace(/@layer\s+[^{]+;/g, "");
    daisyStripped = unwrapLayerBlocks(daisyStripped);
    daisyStripped = daisyStripped.replace(
      /var\(--color-(primary|secondary|accent|neutral|base-[0-9]+|base-content|info|success|warning|error)(-content)?\)/g,
      "var(--$1$2)"
    );
    // Drop rules whose selectors mention classes the page doesn't use.
    // Class candidates carry responsive / state prefixes (e.g. `md:btn-primary`);
    // strip them so DaisyUI's bare `.btn-primary` selector matches.
    const bareCandidates = new Set<string>();
    for (const cls of classes) {
      bareCandidates.add(cls.replace(/^[a-z-]+:/g, ""));
    }
    daisyStripped = purgeDaisyUIRules(daisyStripped, bareCandidates);
    stripped = daisyStripped + " " + stripped;
  }

  // Apply per-site breakpoint rewrite (no-op when defaults). Must run BEFORE minify
  // so the `@media (width >= 48rem)` form (with spaces) is intact for the regex.
  // `editor: true` ALSO rewrites `@media` → `@container ph-editor-canvas` so the
  // /build canvas responds to its own width (enables Phase 3 side-by-side).
  stripped = applyBreakpointRewrite(stripped, breakpoints, { editor });

  // Strip unused @keyframes for lean exports (standalone HTML)
  if (lean) {
    stripped = stripUnusedKeyframes(stripped);
  }

  // Minify
  stripped = minifyCSS(stripped);

  // Prepend theme CSS variables if provided
  if (themeCSS) {
    stripped = `${minifyCSS(themeCSS)} ${stripped}`.trim();
  }

  return stripped || "";
}

/**
 * One-call solution: render HTML + compile CSS + build complete static page.
 * Server-side only.
 */
export async function buildStaticPage(
  content: string,
  options?: {
    compressed?: boolean;
    document?: boolean;
    title?: string;
  }
): Promise<{
  html: string;
  css: string;
  fontUrls: string[];
  scrollObserverScript: string;
  seo: {
    title: string;
    description: string;
    ogImage?: string;
    jsonLd?: Record<string, unknown>;
    schema?: unknown[];
  } | null;
}> {
  const { compressed = true, document: wrapDocument = false, title } = options || {};

  // 1. Render HTML + collect classes + theme data
  const renderResult = renderToHTML(content, {
    compressed,
    document: false, // We handle document wrapping ourselves
    title,
  });

  // 2. Compile CSS
  const css = await compileCSS({
    classes: renderResult.classes,
    themeCSS: renderResult.themeCSS,
    breakpoints: renderResult.breakpoints,
  });

  // 3. Optionally wrap in a complete HTML document
  if (wrapDocument) {
    const fontLinks = renderResult.fontUrls
      .map(url => `<link rel="stylesheet" href="${url}" media="print" onload="this.media='all'" />`)
      .join("\n    ");

    const pageTitle = title || renderResult.seo?.title || "";

    const metaDesc = renderResult.seo?.description
      ? `<meta name="description" content="${renderResult.seo.description.replace(/"/g, "&quot;")}" />`
      : "";

    const ogImageMeta = renderResult.seo?.ogImage
      ? `<meta property="og:image" content="${renderResult.seo.ogImage.replace(/"/g, "&quot;")}" />`
      : "";

    const jsonLdObjects: Record<string, any>[] = [];
    const jsonLd = normalizeJsonLd(renderResult.seo?.jsonLd);
    if (jsonLd) jsonLdObjects.push(jsonLd);
    const schemaEntries = (renderResult.seo as { schema?: SchemaEntry[] } | null)?.schema;
    if (Array.isArray(schemaEntries) && schemaEntries.length) {
      jsonLdObjects.push(...compileSchema(schemaEntries));
    }
    const jsonLdScript = jsonLdObjects
      .map(
        obj =>
          `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`
      )
      .join("\n    ");

    const doc = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${pageTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>
    ${metaDesc}
    ${ogImageMeta}
    ${fontLinks}
    ${jsonLdScript}
    <style>
${css}
    </style>
</head>
<body>
${renderResult.html}
${renderResult.scrollObserverScript}
</body>
</html>`;

    return {
      html: doc,
      css,
      fontUrls: renderResult.fontUrls,
      scrollObserverScript: renderResult.scrollObserverScript,
      seo: renderResult.seo,
    };
  }

  return {
    html: renderResult.html,
    css,
    fontUrls: renderResult.fontUrls,
    scrollObserverScript: renderResult.scrollObserverScript,
    seo: renderResult.seo,
  };
}

/**
 * Compile Tailwind + DaisyUI CSS from compressed Craft.js page data.
 *
 * Drop-in replacement for the app's compileTailwindCSS — handles decompression,
 * class extraction, modifier utilities, and compilation in one call.
 *
 * @param pageData - Base64+lzutf8 compressed Craft.js JSON
 * @param opts.editor - When true, rewrites `@media` → `@container ph-editor-canvas`
 *   so the editor canvas responds to its own container width. MUST be false
 *   for /view, /static, custom domains.
 * @returns Compiled, minified CSS string or null if compilation fails
 */
export async function compileTailwindCSS(
  pageData: string,
  opts?: { editor?: boolean }
): Promise<string | null> {
  try {
    // pageData may arrive as plain JSON (viewer pipeline) or lz-base64
    // (editor save format). Detect cheaply via the leading char.
    let nodes: any;
    const trimmed = pageData.trimStart();
    if (trimmed.startsWith("{")) {
      nodes = JSON.parse(trimmed);
    } else {
      const lz = await import("lzutf8");
      const decompressed = lz.decompress(lz.decodeBase64(pageData));
      nodes = JSON.parse(decompressed);
    }
    const candidates = extractCandidatesFromNodes(nodes);

    if (candidates.length === 0) return null;

    // Per-site breakpoints live on ROOT.props.theme.breakpoints. Surface them so
    // the compiled CSS @media thresholds reflect the site's chosen widths.
    const rootProps = nodes?.ROOT?.props ?? {};
    const breakpoints: Record<string, number> | undefined =
      rootProps.theme?.breakpoints || undefined;

    const css = await compileCSS({
      classes: candidates,
      nodes,
      breakpoints,
      editor: opts?.editor === true,
    });
    return css || null;
  } catch (error) {
    sdkLog.error("[compileTailwindCSS] Failed:", error);
    return null;
  }
}
