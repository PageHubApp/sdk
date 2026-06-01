// ── Theme CSS loader (singleton) ───────────────────────────────────────────

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let _themeCSS: string | null = null;

export function getThemeCSS(): string {
  if (_themeCSS === null) {
    try {
      // This file lives at src/compile-css/assets/; css/ sits under src/.
      _themeCSS = readFileSync(resolve(__dirname, "../../css/theme.css"), "utf-8");
    } catch {
      _themeCSS = "";
    }
  }
  return _themeCSS;
}
