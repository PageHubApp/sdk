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

/** The compiler source, built once per preflight setting. */
const _source = new Map<boolean, string>();

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
 * The defaults' `:root` blocks (default palette, spatial scale) ship after the utilities, while a site's own
 * `:root` tokens are prepended by `compileCSS`. At equal specificity the later block wins, so the defaults would
 * paint over the site's palette. `:where(:root)` has no specificity: the site's tokens win in any order, and a
 * page with no theme of its own still gets the defaults.
 */
export function lowerDefaultRootSpecificity(css: string): string {
  return css.replace(/(^|\n):root(\s*\{)/g, "$1:where(:root)$2");
}

function compilerSource(preflight: boolean): string {
  let source = _source.get(preflight);
  if (source === undefined) {
    const parts = [
      TAILWIND_ENTRY[`${preflight}`],
      lowerDefaultRootSpecificity(getThemeCSS()),
      lowerDefaultRootSpecificity(getSpatialCSS()),
      getAnimationCSS(),
    ];
    source = parts.filter(Boolean).join("\n");
    _source.set(preflight, source);
  }
  return source;
}

/**
 * A fresh compiler for each page. Tailwind's `build()` keeps every candidate it
 * has ever been given, so a shared compiler emits the utilities of every page
 * the process rendered before — bloating this page's CSS and masking classes
 * its own candidate list misses. Compiling the cached source costs a few ms.
 */
export async function getCompiler(preflight = true) {
  const { compile } = await import("@tailwindcss/node");
  return compile(compilerSource(preflight), {
    base: COMPILER_BASE,
    onDependency() {},
  });
}
