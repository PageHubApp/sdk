// ── DaisyUI CSS loading ────────────────────────────────────────────────────

import { readFileSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve, join } from "path";
import { DAISYUI_CLASS_MAP } from "./classMap";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Resolve DaisyUI component directory ────────────────────────────────────

let _daisyuiDir: string | null = null;

export function getDaisyUIDir(): string {
  if (_daisyuiDir !== null) return _daisyuiDir;
  // Try relative from SDK source first (works in dev / monorepo).
  // This file lives at src/compile-css/daisyui/, so reach repo-root node_modules
  // by walking up five levels (daisyui → compile-css → src → sdk → packages).
  const fromSource = resolve(__dirname, "../../../../../node_modules/daisyui/components");
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

const daisyuiCSSCache = new Map<string, string>();

export function loadDaisyUIComponent(file: string): string {
  if (daisyuiCSSCache.has(file)) return daisyuiCSSCache.get(file)!;
  const css = readFileSync(join(getDaisyUIDir(), file), "utf-8");
  daisyuiCSSCache.set(file, css);
  return css;
}

export function collectDaisyUICSS(candidates: string[]): string {
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
