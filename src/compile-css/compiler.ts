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

let _compiler: ReturnType<typeof initCompiler> | null = null;

async function initCompiler() {
  const { compile } = await import("@tailwindcss/node");
  const theme = getThemeCSS();
  const spatial = getSpatialCSS();
  const animations = getAnimationCSS();
  const parts = ['@import "tailwindcss";', theme, spatial, animations].filter(Boolean);
  return compile(parts.join("\n"), {
    base: COMPILER_BASE,
    onDependency() {},
  });
}

export function getCompiler() {
  if (!_compiler) {
    _compiler = initCompiler();
  }
  return _compiler;
}
