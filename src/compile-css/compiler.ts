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

let _source: string | null = null;

/**
 * The defaults' `:root` blocks (default palette, spatial scale) ship after the utilities, while a site's own
 * `:root` tokens are prepended by `compileCSS`. At equal specificity the later block wins, so the defaults would
 * paint over the site's palette. `:where(:root)` has no specificity: the site's tokens win in any order, and a
 * page with no theme of its own still gets the defaults.
 */
export function lowerDefaultRootSpecificity(css: string): string {
  return css.replace(/(^|\n):root(\s*\{)/g, "$1:where(:root)$2");
}

function compilerSource(): string {
  if (_source === null) {
    const parts = [
      '@import "tailwindcss";',
      lowerDefaultRootSpecificity(getThemeCSS()),
      lowerDefaultRootSpecificity(getSpatialCSS()),
      getAnimationCSS(),
    ];
    _source = parts.filter(Boolean).join("\n");
  }
  return _source;
}

/**
 * A fresh compiler for each page. Tailwind's `build()` keeps every candidate it
 * has ever been given, so a shared compiler emits the utilities of every page
 * the process rendered before — bloating this page's CSS and masking classes
 * its own candidate list misses. Compiling the cached source costs a few ms.
 */
export async function getCompiler() {
  const { compile } = await import("@tailwindcss/node");
  return compile(compilerSource(), {
    base: COMPILER_BASE,
    onDependency() {},
  });
}
