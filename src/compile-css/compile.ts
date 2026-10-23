// ── SSR Tailwind + DaisyUI pipeline ────────────────────────────────────────
//
// Class candidates → compile utilities → load + prune DaisyUI components →
// unwrap layers → rewrite breakpoints → strip unused keyframes → minify →
// prepend theme vars.

import { DAISYUI_ATTR } from "../utils/design/resolveTheme";
import { scopeCss } from "../utils/canvasScope";
import { applyBreakpointRewrite } from "../utils/breakpointRewrite";
import { collectDaisyUICSS } from "./daisyui/loader";
import { purgeDaisyUIRules } from "./daisyui/purgeRules";
import { unwrapLayerBlocks } from "./transforms/unwrapLayers";
import { stripSelfReferencingVars } from "./transforms/stripSelfReferencingVars";
import { stripUnusedKeyframes } from "./transforms/stripKeyframes";
import { minifyCSS } from "./transforms/minify";
import { getCompiler } from "./compiler";

/**
 * Compile Tailwind CSS for a set of class candidates.
 * Server-side only — requires Node.js (uses @tailwindcss/node and fs).
 *
 * @param options.classes - Tailwind class candidates
 * @param options.themeCSS - Optional theme CSS variables
 * @param options.lean - Strip unused @keyframes and skip spotlight presets (for standalone exports)
 * @returns Compiled, minified CSS string
 */
export async function compileCSS(options: {
  classes: string[];
  themeCSS?: string;
  /** Strip @keyframes no compiled rule references (standalone exports, public renders) */
  lean?: boolean;
  /** With `lean`: keep any keyframes whose name appears in this text (the page's source). */
  keepKeyframesMentionedIn?: string;
  /**
   * Per-site breakpoint overrides (px). When provided and non-default, the compiled
   * output's `@media (width >= …)` thresholds (Tailwind + DaisyUI) are rewritten in
   * place via `applyBreakpointRewrite`.
   */
  breakpoints?: Record<string, number>;
  /**
   * Editor mode (Phase 3). When true, ALSO rewrites `@media` → `@container
   * ph-editor-canvas` so the editor canvas responds to its own width and
   * side-by-side mirror frames can show different bps simultaneously.
   *
   * MUST be false (or omitted) for /view, /static, custom domains — public
   * renders need real `@media` to respond to the browser viewport.
   */
  editor?: boolean;
  /**
   * Ship DaisyUI component CSS for the page's `btn` / `hero` / … classes.
   * Default true; false for a site whose theme turns DaisyUI off
   * (`resolveTheme(rootProps).daisyui`), so its own `.hero` isn't restyled.
   */
  daisyui?: boolean;
  /**
   * The caller wraps the output in `scopeCss` (the dashboard canvas). DaisyUI
   * rules then go inside `@scope (:root) to ([data-daisyui="off"])`, so turning
   * DaisyUI off in the open editor takes effect without a reload. Never set it
   * for CSS used unscoped: a scoped rule beats an unscoped utility of the same
   * specificity, so `btn px-space-md` would lose its padding.
   */
  canvasScoped?: boolean;
}): Promise<string> {
  const {
    classes,
    themeCSS,
    lean = false,
    keepKeyframesMentionedIn,
    breakpoints,
    editor = false,
    daisyui = true,
    canvasScoped = false,
  } = options;

  if (classes.length === 0) return themeCSS || "";

  // Collect DaisyUI component CSS for used classes
  const daisyuiCSS = daisyui ? collectDaisyUICSS(classes) : "";

  // Compile Tailwind utilities
  const compiler = await getCompiler();
  const css = compiler.build(classes);

  // Keep Tailwind's preflight intact — `unwrapLayerBlocks` below flattens the
  // `@layer base { … }` block so it ships as plain CSS in the static export
  // (no host preflight to rely on). For host-embedded paths (/view, /static
  // React, the editor) the host's own globals.css ships preflight too — the
  // duplicate rules are byte-bloat but byte-for-byte identical, so they're
  // harmless. The previous approach (strip + manually re-emit a curated
  // subset) silently lost rules every time Tailwind preflight grew, and was
  // the source of the link-color, heading-size, and list-bullet regressions.
  let stripped = css.replace(/@layer\s+[^{]+;/g, "");
  stripped = unwrapLayerBlocks(stripped);
  stripped = stripSelfReferencingVars(stripped);

  // Prepend DaisyUI CSS (unwrapped, with --color-* remapped, pruned to used selectors)
  if (daisyuiCSS) {
    let daisyStripped = daisyuiCSS.replace(/@layer\s+[^{]+;/g, "");
    daisyStripped = unwrapLayerBlocks(daisyStripped);
    daisyStripped = daisyStripped.replace(
      /var\(--color-(primary|secondary|accent|neutral|base-[0-9]+|base-content|info|success|warning|error)(-content)?\)/g,
      "var(--$1$2)"
    );
    // Drop rules whose selectors mention classes the page doesn't use.
    // Class candidates carry responsive / state prefixes (e.g. `md:btn-primary`);
    // strip them so DaisyUI's bare `.btn-primary` selector matches.
    const bareCandidates = new Set<string>();
    for (const cls of classes) {
      bareCandidates.add(cls.replace(/^[a-z-]+:/g, ""));
    }
    daisyStripped = purgeDaisyUIRules(daisyStripped, bareCandidates);
    if (canvasScoped) {
      daisyStripped = scopeCss(daisyStripped, ":root", { to: `[${DAISYUI_ATTR}="off"]` });
    }
    stripped = daisyStripped + " " + stripped;
  }

  // Apply per-site breakpoint rewrite (no-op when defaults). Must run BEFORE minify
  // so the `@media (width >= 48rem)` form (with spaces) is intact for the regex.
  // `editor: true` ALSO rewrites `@media` → `@container ph-editor-canvas` so the
  // The editor canvas responds to its own width (enables Phase 3 side-by-side).
  stripped = applyBreakpointRewrite(stripped, breakpoints, { editor });

  // Strip @keyframes nothing on the page uses
  if (lean) {
    stripped = stripUnusedKeyframes(stripped, keepKeyframesMentionedIn);
  }

  // Minify
  stripped = minifyCSS(stripped);

  // Prepend theme CSS variables if provided
  if (themeCSS) {
    stripped = `${minifyCSS(themeCSS)} ${stripped}`.trim();
  }

  return stripped || "";
}
