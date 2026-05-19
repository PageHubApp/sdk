/**
 * @pagehub/sdk — Server-side CSS compilation
 *
 * Adapts the app's compileTailwindCSS pipeline into the SDK.
 * Server-side only — requires Node.js (uses @tailwindcss/node and fs).
 *
 * Usage:
 * ```ts
 * import { compileCSS, buildStaticPage } from '@pagehub/sdk/compile-css';
 *
 * // Compile CSS for a set of classes (from renderToHTML().classes)
 * const css = await compileCSS({ classes: result.classes, themeCSS: result.themeCSS });
 *
 * // One-call: render + compile + assemble
 * const page = await buildStaticPage(compressedContent, { document: true });
 * ```
 */

import { readFileSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve, join } from "path";
import { renderToHTML } from "./static-renderer/renderToHTML";
import type { RenderToHTMLOptions } from "./static-renderer/types";
import { BUILTIN_COMPONENT_DEFS } from "./core/builtinComponentDefs";
import { buildModifierExpansionMap, expandModifierClassName } from "./utils/modifierUtils";
import { compileSchema, normalizeLegacyJsonLd } from "./utils/seo/compileSchema";
import type { SchemaEntry } from "./utils/seo/schemaTypes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── DaisyUI class → component file mapping ─────────────────────────────────

const DAISYUI_CLASS_MAP: Record<string, string> = {
  alert: "alert.css",
  avatar: "avatar.css",
  badge: "badge.css",
  breadcrumbs: "breadcrumbs.css",
  btn: "button.css",
  card: "card.css",
  carousel: "carousel.css",
  chat: "chat.css",
  checkbox: "checkbox.css",
  collapse: "collapse.css",
  countdown: "countdown.css",
  diff: "diff.css",
  divider: "divider.css",
  dock: "dock.css",
  drawer: "drawer.css",
  dropdown: "dropdown.css",
  fieldset: "fieldset.css",
  "file-input": "fileinput.css",
  filter: "filter.css",
  footer: "footer.css",
  hero: "hero.css",
  indicator: "indicator.css",
  input: "input.css",
  kbd: "kbd.css",
  label: "label.css",
  link: "link.css",
  list: "list.css",
  loading: "loading.css",
  mask: "mask.css",
  menu: "menu.css",
  "mockup-code": "mockup.css",
  "mockup-window": "mockup.css",
  modal: "modal.css",
  navbar: "navbar.css",
  progress: "progress.css",
  "radial-progress": "radialprogress.css",
  radio: "radio.css",
  range: "range.css",
  rating: "rating.css",
  select: "select.css",
  skeleton: "skeleton.css",
  stack: "stack.css",
  stats: "stat.css",
  stat: "stat.css",
  status: "status.css",
  steps: "steps.css",
  step: "steps.css",
  swap: "swap.css",
  tabs: "tab.css",
  tab: "tab.css",
  table: "table.css",
  textarea: "textarea.css",
  timeline: "timeline.css",
  toast: "toast.css",
  toggle: "toggle.css",
  tooltip: "tooltip.css",
};

// ── Resolve DaisyUI component directory ────────────────────────────────────

let _daisyuiDir: string | null = null;

function getDaisyUIDir(): string {
  if (_daisyuiDir !== null) return _daisyuiDir;
  // Try relative from SDK source first (works in dev / monorepo).
  const fromSource = resolve(__dirname, "../../../node_modules/daisyui/components");
  try {
    statSync(fromSource);
    _daisyuiDir = fromSource;
  } catch {
    // Bundled (Vercel): __dirname is the output bundle dir, not the source tree.
    // process.cwd() is always the project root on Vercel serverless.
    _daisyuiDir = resolve(/*turbopackIgnore: true*/ process.cwd(), "node_modules/daisyui/components");
  }
  return _daisyuiDir;
}

// ── Layer unwrapping ───────────────────────────────────────────────────────

function unwrapLayerBlocks(css: string): string {
  const layerRe = /@layer\s+[^{;]+\{/g;
  let result = "";
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = layerRe.exec(css)) !== null) {
    result += css.slice(lastIndex, match.index);
    let depth = 1;
    let j = match.index + match[0].length;
    const innerStart = j;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    result += unwrapLayerBlocks(css.slice(innerStart, j - 1));
    lastIndex = j;
    layerRe.lastIndex = j;
  }
  result += css.slice(lastIndex);
  return result;
}

// ── DaisyUI CSS loading ────────────────────────────────────────────────────

const daisyuiCSSCache = new Map<string, string>();

function loadDaisyUIComponent(file: string): string {
  if (daisyuiCSSCache.has(file)) return daisyuiCSSCache.get(file)!;
  const css = readFileSync(join(getDaisyUIDir(), file), "utf-8");
  daisyuiCSSCache.set(file, css);
  return css;
}

function collectDaisyUICSS(candidates: string[]): string {
  const files = new Set<string>();
  for (const cls of candidates) {
    const bare = cls.replace(/^[a-z-]+:/g, "");
    for (const [prefix, file] of Object.entries(DAISYUI_CLASS_MAP)) {
      if (bare === prefix || bare.startsWith(prefix + "-")) {
        files.add(file);
        break;
      }
    }
  }
  if (files.size === 0) return "";
  return [...files].map(loadDaisyUIComponent).join("\n");
}

// ── DaisyUI rule pruner ────────────────────────────────────────────────────

/**
 * Drop DaisyUI rules whose selectors reference classes the page never uses.
 * `collectDaisyUICSS` ships entire component files (e.g. `button.css`) when ANY
 * `btn*` class is used — Lighthouse flags the unused variants as wasted bytes.
 *
 * Strategy: split CSS into top-level blocks, keep a rule if at least one of
 * its comma-separated selectors has every class in the candidate set (or has
 * no class at all — bare element/attribute selectors). Recurses through
 * `@media` / `@supports` / `@container` wrappers; leaves `@keyframes`,
 * `@property`, `@font-face`, `@import` untouched (orphan keyframes are
 * dropped later by `stripUnusedKeyframes`).
 */
function purgeDaisyUIRules(css: string, candidates: Set<string>): string {
  if (!css.trim() || candidates.size === 0) return css;

  // CSS class tokens in a selector — `\w` plus `-`, prefixed by `.`.
  const classRe = /\.([\w-]+)/g;

  const selectorPasses = (sel: string): boolean => {
    return sel.split(",").some(part => {
      const classes: string[] = [];
      let m: RegExpExecArray | null;
      classRe.lastIndex = 0;
      while ((m = classRe.exec(part)) !== null) classes.push(m[1]);
      if (classes.length === 0) return true; // bare element / pseudo selector
      return classes.every(c => candidates.has(c));
    });
  };

  // Iterate top-level blocks. Block = either `<selector> { ... }` (rule) or
  // `@<name> ... { ... }` (at-rule). Re-emit each based on its kind.
  const out: string[] = [];
  let i = 0;
  while (i < css.length) {
    // Skip whitespace
    while (i < css.length && /\s/.test(css[i])) i++;
    if (i >= css.length) break;

    // Find end of selector / at-rule prelude (up to `{` or `;`)
    let j = i;
    while (j < css.length && css[j] !== "{" && css[j] !== ";") j++;

    // Bare statement (e.g. `@import ...;`) — keep as-is.
    if (j < css.length && css[j] === ";") {
      out.push(css.slice(i, j + 1));
      i = j + 1;
      continue;
    }

    // No opening brace — trailing junk; bail.
    if (j >= css.length) {
      out.push(css.slice(i));
      break;
    }

    const prelude = css.slice(i, j).trim();
    // Walk to matching `}`.
    let depth = 1;
    let k = j + 1;
    while (k < css.length && depth > 0) {
      if (css[k] === "{") depth++;
      else if (css[k] === "}") depth--;
      k++;
    }
    const body = css.slice(j + 1, k - 1);
    const isAtRule = prelude.startsWith("@");

    if (isAtRule) {
      // Pass-through types — never inspect body.
      if (
        prelude.startsWith("@keyframes") ||
        prelude.startsWith("@-webkit-keyframes") ||
        prelude.startsWith("@font-face") ||
        prelude.startsWith("@property") ||
        prelude.startsWith("@page") ||
        prelude.startsWith("@layer") ||
        prelude.startsWith("@theme")
      ) {
        out.push(css.slice(i, k));
      } else if (
        prelude.startsWith("@media") ||
        prelude.startsWith("@supports") ||
        prelude.startsWith("@container")
      ) {
        const inner = purgeDaisyUIRules(body, candidates);
        if (inner.trim()) out.push(`${prelude} { ${inner} }`);
      } else {
        // Unknown at-rule — keep.
        out.push(css.slice(i, k));
      }
    } else {
      if (selectorPasses(prelude)) out.push(`${prelude} { ${body} }`);
    }

    i = k;
  }
  return out.join("\n");
}

// ── CSS file loading (theme, spatial, animations) ──────────────────────────

let _themeCSS: string | null = null;
let _spatialCSS: string | null = null;
let _animationCSS: string | null = null;

function getThemeCSS(): string {
  if (_themeCSS === null) {
    try {
      _themeCSS = readFileSync(resolve(__dirname, "css/theme.css"), "utf-8");
    } catch {
      _themeCSS = "";
    }
  }
  return _themeCSS;
}

function getSpatialCSS(): string {
  if (_spatialCSS === null) {
    // Try workspace source (dev / monorepo), then node_modules relative, then cwd fallback.
    const candidates = [
      resolve(__dirname, "../../daisyui-spatial/src/index.css"),
      resolve(__dirname, "../../../node_modules/@pagehub/daisyui-spatial/src/index.css"),
      resolve(
        /*turbopackIgnore: true*/ process.cwd(),
        "node_modules/@pagehub/daisyui-spatial/src/index.css"
      ),
    ];
    for (const p of candidates) {
      try {
        _spatialCSS = readFileSync(p, "utf-8");
        break;
      } catch {
        // try next
      }
    }
    if (_spatialCSS === null) _spatialCSS = "";
  }
  return _spatialCSS;
}

function getAnimationCSS(): string {
  if (_animationCSS === null) {
    try {
      const full = readFileSync(resolve(__dirname, "css/styles.css"), "utf-8");
      const parts: string[] = [];

      // Extract @theme inline block — only animation-related vars
      const themeMatch = full.match(/@theme inline \{[\s\S]*?\n\}/);
      if (themeMatch) {
        const lines = themeMatch[0].split("\n");
        const animLines = lines.filter(
          l => l.includes("--animate-css-") || l.includes("@theme") || l.trim() === "}"
        );
        if (animLines.length > 2) parts.push(animLines.join("\n"));
      }

      // Extract all @keyframes css-* blocks
      const keyframeStartRe = /@keyframes css-[\w-]+\s*\{/g;
      let match;
      while ((match = keyframeStartRe.exec(full)) !== null) {
        let depth = 1;
        let j = match.index + match[0].length;
        while (j < full.length && depth > 0) {
          if (full[j] === "{") depth++;
          else if (full[j] === "}") depth--;
          j++;
        }
        parts.push(full.slice(match.index, j));
      }

      // Scroll trigger rules
      parts.push(`.ph-anim-scroll { animation-play-state: paused; }`);
      parts.push(`.ph-anim-scroll.ph-in-view { animation-play-state: running; }`);

      // Hover animation utilities
      const hoverRe = /@utility ph-hover-[\w-]+\s*\{[\s\S]*?\n\}/g;
      while ((match = hoverRe.exec(full)) !== null) {
        parts.push(match[0]);
      }

      _animationCSS = parts.join("\n");
    } catch {
      _animationCSS = "";
    }
  }
  return _animationCSS;
}

// ── Tailwind compiler singleton ────────────────────────────────────────────

let _compiler: ReturnType<typeof initCompiler> | null = null;

async function initCompiler() {
  const { compile } = await import("@tailwindcss/node");
  const theme = getThemeCSS();
  const spatial = getSpatialCSS();
  const animations = getAnimationCSS();
  const parts = ['@import "tailwindcss";', theme, spatial, animations].filter(Boolean);
  return compile(parts.join("\n"), {
    base: __dirname,
    onDependency() {},
  });
}

function getCompiler() {
  if (!_compiler) {
    _compiler = initCompiler();
  }
  return _compiler;
}

// ── Class extraction from Craft.js JSON ──────────────────────────────────

function extractCandidatesFromNodes(nodes: Record<string, any>): string[] {
  const candidates = new Set<string>();
  const implicit = [
    "cursor-pointer",
    "sr-only",
    "not-sr-only",
    "overflow-hidden",
    "relative",
    "absolute",
    // Button/Link icon wrapper defaults (Button.craft.tsx): when an author omits
    // `icon.size`, the runtime stamps `w-6 h-6` plus the hard-coded wrapper
    // classes. None of these live on any `props.className`, so they're invisible
    // to the candidate scanner.
    "w-6",
    "h-6",
    "fill-current",
    "flex",
    "items-center",
    "justify-center",
  ];
  for (const c of implicit) candidates.add(c);

  // Build modifier expansion map so modifier names get expanded to real classes.
  // Merges def-shipped built-in modifiers (e.g. "accordion-slide-fade" on
  // Container) with site-level overrides at ROOT.props.modifiers (site wins).
  const modifiers = nodes?.ROOT?.props?.modifiers;
  const expansionMap = buildModifierExpansionMap(
    modifiers && typeof modifiers === "object" ? modifiers : {},
    BUILTIN_COMPONENT_DEFS
  );

  for (const node of Object.values(nodes)) {
    const props = (node as any)?.props;
    if (!props) continue;

    if (typeof props.className === "string" && props.className.trim()) {
      const expanded =
        expansionMap.size > 0
          ? expandModifierClassName(props.className, expansionMap)
          : props.className;
      for (const cls of expanded.split(/\s+/)) if (cls) candidates.add(cls);
    }
    if (Array.isArray(props.className)) {
      for (const cls of props.className)
        if (typeof cls === "string" && cls.trim()) candidates.add(cls);
    }
    if (typeof props.helpers === "string" && props.helpers.trim()) {
      for (const cls of props.helpers.split(/\s+/)) if (cls) candidates.add(cls);
    }
    const anim = props.root?.animation;
    if (typeof anim === "string" && anim.startsWith("css")) {
      const kebab = anim.replace(/([A-Z])/g, "-$1").toLowerCase();
      candidates.add(`animate-${kebab}`);
      candidates.add("ph-anim-scroll");
    }
    const hoverClass = props.root?.hoverAnimation;
    if (typeof hoverClass === "string" && hoverClass.trim()) candidates.add(hoverClass);

    // Button/Link icon prop — `size`, `gap`, `color` are className strings the
    // renderer stamps onto the wrapper span. Pull them in so author-supplied
    // sizes (e.g. `size-5`, `w-8 h-8`) compile.
    const icon = props.icon;
    if (icon && typeof icon === "object") {
      for (const key of ["size", "gap", "color", "className"]) {
        const val = (icon as any)[key];
        if (typeof val === "string" && val.trim()) {
          for (const cls of val.split(/\s+/)) if (cls) candidates.add(cls);
        }
      }
    }
  }
  return [...candidates];
}

// ── Minification helper ────────────────────────────────────────────────────

function minifyCSS(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Strip unused @keyframes ───────────────────────────────────────────────

/**
 * Remove @keyframes blocks whose name is not referenced by any animation-name
 * in the CSS output. Prevents animation presets from bloating standalone exports.
 */
function stripUnusedKeyframes(css: string): string {
  // Collect all @keyframes names
  const keyframeBlocks: { name: string; start: number; end: number }[] = [];
  const kfRe = /@keyframes\s+([\w-]+)\s*\{/g;
  let m;
  while ((m = kfRe.exec(css)) !== null) {
    let depth = 1;
    let j = m.index + m[0].length;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    keyframeBlocks.push({ name: m[1], start: m.index, end: j });
  }
  if (keyframeBlocks.length === 0) return css;

  // Find which animation names are actually referenced
  const usedNames = new Set<string>();
  const animRe = /animation(?:-name)?\s*:\s*([^;{}]+)/g;
  while ((m = animRe.exec(css)) !== null) {
    for (const token of m[1].split(/[\s,]+/)) {
      if (token && token !== "none" && token !== "inherit" && token !== "initial") {
        usedNames.add(token);
      }
    }
  }

  // Remove unreferenced keyframes (iterate in reverse to preserve indices)
  let result = css;
  for (let i = keyframeBlocks.length - 1; i >= 0; i--) {
    const kb = keyframeBlocks[i];
    if (!usedNames.has(kb.name)) {
      result = result.slice(0, kb.start) + result.slice(kb.end);
    }
  }
  return result;
}

// ── Per-site breakpoint rewriting ─────────────────────────────────────────

import { applyBreakpointRewrite } from "./utils/breakpointRewrite";
export { applyBreakpointRewrite, rewriteBreakpoints } from "./utils/breakpointRewrite";

// ── Public API ─────────────────────────────────────────────────────────────

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
    jsonLd?: unknown;
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
    const legacyJsonLd = normalizeLegacyJsonLd(renderResult.seo?.jsonLd);
    if (legacyJsonLd) jsonLdObjects.push(legacyJsonLd);
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
    // pageData may arrive as plain JSON (post-PR5 viewer) or lz-base64
    // (legacy / editor save format). Detect cheaply via the leading char.
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
    console.error("[compileTailwindCSS] Failed:", error);
    return null;
  }
}
