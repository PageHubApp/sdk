// ── Spatial CSS loader (singleton, 3-candidate path fallback) ──────────────

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let _spatialCSS: string | null = null;

export function getSpatialCSS(): string {
  if (_spatialCSS === null) {
    // Try workspace source (dev / monorepo), then node_modules relative, then cwd fallback.
    // This file lives at src/compile-css/assets/ (two levels deeper than the
    // original src/compile-css.ts), so each relative path gains two `../`.
    const candidates = [
      resolve(__dirname, "../../../../daisyui-spatial/src/index.css"),
      resolve(__dirname, "../../../../../node_modules/@pagehub/daisyui-spatial/src/index.css"),
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
