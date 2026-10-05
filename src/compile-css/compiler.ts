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

function compilerSource(): string {
  if (_source === null) {
    const parts = ['@import "tailwindcss";', getThemeCSS(), getSpatialCSS(), getAnimationCSS()];
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
