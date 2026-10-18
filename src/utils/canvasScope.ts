/**
 * Keeping a page's CSS on the canvas.
 *
 * The editor puts two stylesheets in the document: the site's compiled CSS and
 * the Tailwind browser runtime's output. Both are unlayered (so they beat the
 * page's own layered utilities) and global. On `/build` the canvas is the whole
 * page, so that's fine. A host that embeds the editor in its own app
 * (the dashboard) would have its chrome restyled by them: an unlayered
 * `.hidden { display: none }` beats the host's layered `lg:flex`.
 *
 * `scopeCss` wraps a stylesheet in `@scope (<selector>)`, so its rules only
 * reach elements inside a canvas box. Every box that renders page content
 * carries `CANVAS_SCOPE_ATTR`: `#viewport`, the side-by-side mirror frames,
 * the drag preview's wrapper, and the live previews outside the canvas
 * (`ComponentPreview` block / section cards, `PreviewPanel`, class-swatch
 * chips in `UnifiedDropdown`). A new element that renders page classes
 * outside the canvas needs it too, or a scoped host leaves it unstyled.
 */

export const CANVAS_SCOPE_ATTR = "data-ph-canvas";
export const CANVAS_SCOPE_SELECTOR = `[${CANVAS_SCOPE_ATTR}]`;

/** Spread onto an element that renders page content. */
export const canvasScopeProps = { [CANVAS_SCOPE_ATTR]: "" } as const;

/** Marks CSS already passed through `scopeCss`, so re-running it is a no-op. */
const SCOPED_MARKER = "/*ph-scoped*/";

/** At-rules that can't live inside `@scope` and don't select elements anyway. */
const GLOBAL_AT_RULE =
  /^@(-webkit-)?(keyframes|font-face|property|import|charset|namespace|font-feature-values|counter-style)\b/i;
/** A `@layer a, b;` statement (order declaration, no block). */
const LAYER_STATEMENT = /^@layer\s[^{]*;$/i;

/**
 * Split CSS into its top-level statements (rules, blocks and `;` statements),
 * skipping comments and respecting strings.
 */
export function splitTopLevel(css: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  let quote: string | null = null;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      const stop = end === -1 ? css.length : end + 2;
      if (depth === 0) {
        const before = css.slice(start, i).trim();
        if (before) out.push(before);
        start = stop;
      }
      i = stop - 1;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth = Math.max(0, depth - 1);
      if (depth === 0) {
        out.push(css.slice(start, i + 1).trim());
        start = i + 1;
      }
    } else if (ch === ";" && depth === 0) {
      const stmt = css.slice(start, i + 1).trim();
      if (stmt) out.push(stmt);
      start = i + 1;
    }
  }
  const rest = css.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/**
 * Document-level selectors (`:root`, `:host`, `html`, `body`) point at the
 * scope root instead, so theme variables and inherited defaults (font, line
 * height) still reach the canvas.
 */
function rootSelectorsToScope(css: string): string {
  return css.replace(
    /(^|[\s,{}(>+~])(:root|:host|html|body)(?![\w-])/g,
    (_m, before: string) => `${before}:scope`
  );
}

/**
 * Limit `css` to elements inside `selector` (`@scope`). `@keyframes`,
 * `@font-face`, `@property` and other non-selector at-rules stay global.
 * Idempotent.
 */
export function scopeCss(css: string, selector: string = CANVAS_SCOPE_SELECTOR): string {
  if (!css || css.startsWith(SCOPED_MARKER)) return css;
  const global: string[] = [];
  const scoped: string[] = [];
  for (const stmt of splitTopLevel(css)) {
    if (GLOBAL_AT_RULE.test(stmt) || LAYER_STATEMENT.test(stmt)) global.push(stmt);
    else scoped.push(stmt);
  }
  const body = scoped.length
    ? `@scope (${selector}){${rootSelectorsToScope(scoped.join("\n"))}}`
    : "";
  return SCOPED_MARKER + [...global, body].filter(Boolean).join("\n");
}
