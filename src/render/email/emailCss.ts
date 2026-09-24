/**
 * Email CSS: compile → resolve vars → evaluate math → lower → strip.
 *
 * Produces a stylesheet with only literal values (hex / rgba colors, px
 * lengths) for juice to inline. Layout declarations are dropped: tables carry
 * layout in email. Server-only (Tailwind compiler + lightningcss).
 */

import { transform } from "lightningcss";
import postcss, { type Root } from "postcss";
import { compileCSS } from "../../compile-css/api";
import { PageHubError } from "../../utils/errors";
import { evalStaticMath } from "./cssMath";
import { collectRootVars, resolveCssVars } from "./cssVars";
import { EMAIL_INLINE_CSS } from "./shell";

/** Appended to the compiled CSS: headings and paragraphs sit flush, links inherit color. */
export const EMAIL_RESET_CSS = "p,h1,h2,h3,h4,h5,h6{margin:0} a{color:inherit}";

/** Old-engine targets so lightningcss lowers `oklch()` / `color-mix()` / nesting / logical props. */
const LOWER_TARGETS = { safari: 10 << 16, chrome: 50 << 16, firefox: 50 << 16, ie: 11 << 16 };

/** lightningcss keeps modern-color duplicates after the hex / rgba fallback; they go. */
const MODERN_COLOR_RE = /\b(lab|lch|oklab|oklch|color)\(/;

const LAYOUT_PROP_RE = /^(flex|flex-.+|grid|grid-.+|gap|row-gap|column-gap|align-.+|justify-.+|place-.+|order)$/;
const LAYOUT_DISPLAY_RE = /(^|\s)(inline-)?(flex|grid)$/;

export interface ResolvedGap {
  /** Column gap in px. */
  x?: number;
  /** Row gap in px. */
  y?: number;
}

export interface EmailCss {
  css: string;
  /** Gap per class token (`gap-space-sm` → `{ x: 12.5, y: 12.5 }`), for the table cells. */
  gaps: Map<string, ResolvedGap>;
}

/** Class tokens worth compiling: no variants (responsive is handled by the email pipeline) and no display toggles. */
export function emailCompileClasses(classes: string[]): string[] {
  return classes.filter(c => !c.includes(":") && c !== "hidden" && c !== "block");
}

/**
 * `@supports` blocks are unwrapped and every other at-rule goes. An unwrapped
 * branch supersedes the fallback declaration before it (Tailwind's
 * `color: var(--x)` ahead of `color: color-mix(…)`): the fallback is removed,
 * or lightningcss treats it as the fallback and lowers the branch to `oklab()`
 * only, which the modern-color strip then drops.
 */
function flattenAtRules(root: Root): void {
  root.walkAtRules(at => {
    if (at.name === "supports" && at.nodes) {
      const kids = at.nodes.map(n => n.clone());
      const props = new Set(kids.flatMap(k => (k.type === "decl" ? [k.prop] : [])));
      at.parent?.each(sibling => {
        if (sibling === at) return false;
        if (sibling.type === "decl" && props.has(sibling.prop)) sibling.remove();
      });
      at.replaceWith(kids);
    } else {
      at.remove();
    }
  });
}

function evaluateMath(root: Root): void {
  root.walkDecls(decl => {
    const value = evalStaticMath(decl.value);
    if (value == null) decl.remove();
    else decl.value = value;
  });
}

function lower(css: string): string {
  const out = transform({ filename: "email.css", code: new TextEncoder().encode(css), targets: LOWER_TARGETS });
  const root = postcss.parse(out.code.toString());
  root.walkDecls(decl => {
    if (MODERN_COLOR_RE.test(decl.value)) decl.remove();
  });
  const lowered = root.toString();
  if (lowered.includes("oklch(") || lowered.includes("var(")) {
    throw new PageHubError({
      code: "EMAIL_RENDER_CSS_UNRESOLVED",
      message: "[renderEmailHTML] CSS still contains oklch() or var() after lowering.",
      hint: "This is a bug in the email CSS pipeline (resolveCssVars / evalStaticMath / lowering).",
    });
  }
  return lowered;
}

function px(value: string | undefined): number | undefined {
  const m = value ? /^(-?\d*\.?\d+)px$/.exec(value.trim()) : null;
  return m ? parseFloat(m[1]) : undefined;
}

/** Read gap values off single-class rules, then drop every layout declaration. */
function extractGapsAndStripLayout(root: Root): Map<string, ResolvedGap> {
  const gaps = new Map<string, ResolvedGap>();
  root.walkRules(rule => {
    const single = /^\.((?:\\.|[^\s,.:>+~[#])+)$/.exec(rule.selector.trim());
    rule.walkDecls(decl => {
      if (single && /^(gap|row-gap|column-gap)$/.test(decl.prop)) {
        const token = single[1].replace(/\\(.)/g, "$1");
        const gap = gaps.get(token) ?? {};
        const [row, col = row] = decl.value.trim().split(/\s+/);
        if (decl.prop !== "column-gap") gap.y = px(row);
        if (decl.prop !== "row-gap") gap.x = px(decl.prop === "gap" ? col : row);
        gaps.set(token, gap);
      }
      const isLayout =
        LAYOUT_PROP_RE.test(decl.prop) ||
        (decl.prop === "display" && LAYOUT_DISPLAY_RE.test(decl.value.trim()));
      if (isLayout) decl.remove();
    });
    if (!rule.nodes?.length) rule.remove();
  });
  return gaps;
}

/**
 * Build the inlinable stylesheet for an email.
 *
 * @param classes  class tokens used by the rendered HTML (`renderToHTML().classes`)
 * @param themeCSS the site `:root` block (`renderToHTML().themeCSS`); its vars win
 */
export async function buildEmailCss(classes: string[], themeCSS: string): Promise<EmailCss> {
  const compiled = await compileCSS({
    classes: emailCompileClasses(classes),
    themeCSS: "",
    lean: true,
  });
  const resolved = resolveCssVars(`${compiled}\n${EMAIL_RESET_CSS}`, collectRootVars(themeCSS));

  const root = postcss.parse(resolved);
  flattenAtRules(root);
  evaluateMath(root);

  const lowered = postcss.parse(lower(root.toString()));
  const gaps = extractGapsAndStripLayout(lowered);
  return { css: `${lowered.toString()}\n${EMAIL_INLINE_CSS}`, gaps };
}
