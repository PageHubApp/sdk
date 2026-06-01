// ── Animation CSS loader (singleton) ───────────────────────────────────────

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let _animationCSS: string | null = null;

/**
 * Extracts the animation-related slice of `css/styles.css`: the `@theme inline`
 * animation vars, every `@keyframes css-*` block, the `.ph-anim-scroll` trigger
 * rules, and the `@utility ph-hover-*` utilities.
 */
export function getAnimationCSS(): string {
  if (_animationCSS === null) {
    try {
      // This file lives at src/compile-css/assets/; css/ sits under src/.
      const full = readFileSync(resolve(__dirname, "../../css/styles.css"), "utf-8");
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
