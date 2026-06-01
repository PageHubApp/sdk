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
export function purgeDaisyUIRules(css: string, candidates: Set<string>): string {
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
