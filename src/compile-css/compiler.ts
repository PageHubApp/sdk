// ── Tailwind compiler singleton ────────────────────────────────────────────
//
// The `@tailwindcss/node` import MUST stay behind the dynamic `import()` below —
// it's a Node-only dep; an eager static import in any file reachable from the
// client bundle breaks the editor. Keep it nowhere but `initCompiler`.

import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { getThemeCSS } from "./assets/themeCss";
import { getSpatialCSS } from "./assets/spatialCss";
import { getAnimationCSS } from "./assets/animationCss";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tailwind's resolution base — preserve the original src/ dir so `@import
// "tailwindcss"` resolves identically (this file sits one level deeper).
const COMPILER_BASE = resolve(__dirname, "..");

/** The compiler source, built once per preflight / DaisyUI setting. */
const _source = new Map<string, string>();

/**
 * Tailwind with or without its preflight reset. Without: the theme and utilities layers only (Tailwind v4's documented
 * split), for a site written against the browser's defaults (an imported non-Tailwind site), where `p { margin: 0 }`
 * and `line-height: 1.5` would move its text.
 */
const TAILWIND_ENTRY = {
  true: '@import "tailwindcss";',
  false: '@layer theme, base, components, utilities;\n@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/utilities.css" layer(utilities);',
} as const;

/**
 * Tailwind v4's preflight leaves buttons on the browser's default cursor, so a button without DaisyUI's `btn` reads as
 * not clickable. `:where()` has no specificity: a `cursor-*` class or a site's own CSS wins in any order. Ships with
 * preflight only, so a site written against the browser's defaults keeps them.
 */
const POINTER_CURSOR =
  ':where(button:not(:disabled), select:not(:disabled), summary, [role="button"], [commandfor], [popovertarget], input[type="checkbox"]:not(:disabled), input[type="radio"]:not(:disabled), input[type="submit"]:not(:disabled), label:has(input[type="checkbox"]:not(:disabled), input[type="radio"]:not(:disabled))) { cursor: pointer; }';

/**
 * The defaults' `:root` blocks (default palette, spatial scale) ship after the utilities, while a site's own
 * `:root` tokens are prepended by `compileCSS`. At equal specificity the later block wins, so the defaults would
 * paint over the site's palette. `:where(:root)` has no specificity: the site's tokens win in any order, and a
 * page with no theme of its own still gets the defaults.
 */
export function lowerDefaultRootSpecificity(css: string): string {
  return css.replace(/(^|\n):root(\s*\{)/g, "$1:where(:root)$2");
}

/**
 * The spatial CSS without its DaisyUI component overrides (`.btn`, `.navbar`, `.card-body`, …: every selector ending in
 * `:where(:not([data-daisyui="off"] *))`), for a site that turns DaisyUI off. They only retune DaisyUI's components;
 * on such a site a `.navbar` is the site's own and would gain a 4rem min-height.
 */
export function withoutDaisyUIOverrides(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/[^{}]*:where\(:not\(\[data-daisyui="off"\] \*\)\)[^{}]*\{[^{}]*\}/g, "");
}

function compilerSource(preflight: boolean, daisyui: boolean): string {
  const key = `${preflight}:${daisyui}`;
  let source = _source.get(key);
  if (source === undefined) {
    const spatial = getSpatialCSS();
    const parts = [
      TAILWIND_ENTRY[`${preflight}`],
      preflight ? POINTER_CURSOR : "",
      lowerDefaultRootSpecificity(getThemeCSS()),
      lowerDefaultRootSpecificity(daisyui ? spatial : withoutDaisyUIOverrides(spatial)),
      getAnimationCSS(),
    ];
    source = parts.filter(Boolean).join("\n");
    _source.set(key, source);
  }
  return source;
}

/**
 * A fresh compiler for each page. Tailwind's `build()` keeps every candidate it
 * has ever been given, so a shared compiler emits the utilities of every page
 * the process rendered before — bloating this page's CSS and masking classes
 * its own candidate list misses. Compiling the cached source costs a few ms.
 */
export async function getCompiler(preflight = true, daisyui = true) {
  const { compile } = await import("@tailwindcss/node");
  return compile(compilerSource(preflight, daisyui), {
    base: COMPILER_BASE,
    onDependency() {},
  });
}
