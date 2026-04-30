/**
 * Breakpoint @media threshold rewriter — pure string transformation, safe for
 * client AND server use.
 *
 * Used by:
 *   - SSR `compileCSS` (compile-css.ts) — applies site `theme.breakpoints` to
 *     just-compiled Tailwind/DaisyUI output before it ships in the page.
 *   - Editor `/build` ViewportShell — applies live drag-commit changes to the
 *     in-page `<style id="tailwind-compiled">` content for instant reactivity
 *     (no server roundtrip).
 *
 * Handles three input forms in compiled CSS:
 *   - Tailwind rem:  `@media (width >= 48rem)`   (default-state output)
 *   - Tailwind px:   `@media (width >= 768px)`   (post-rewrite output)
 *   - DaisyUI px:    `@media (width>=768px)`     (DaisyUI always emits px, no spaces)
 *
 * Output is normalized to px for both Tailwind and DaisyUI, so subsequent
 * deltas need only handle px.
 */

export const DEFAULT_BREAKPOINTS_PX = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export const BP_KEYS = ["sm", "md", "lg", "xl", "2xl"] as const;
export type BpKey = (typeof BP_KEYS)[number];

/**
 * Rewrite from one set of breakpoint values to another. Atomic placeholder pass
 * prevents stomping when a new value collides with another key's old value.
 * Returns input unchanged when `from === to` for every key.
 */
export function rewriteBreakpoints(
  css: string,
  fromBps: Record<BpKey, number>,
  toBps: Record<BpKey, number>
): string {
  if (BP_KEYS.every(k => fromBps[k] === toBps[k])) return css;

  let out = css;

  // Pass 1: replace every recognizable form with a key-scoped placeholder.
  // Tailwind/DaisyUI emit `@media`; the editor's container-rewrite turns those
  // into `@container ph-editor-canvas` — both forms are handled so live-update
  // works whether or not the editor flag is on.
  for (const key of BP_KEYS) {
    const fromPx = fromBps[key];
    const fromRem = fromPx / 16;
    const remStr = `${fromRem}`;

    // Tailwind rem form (Tailwind v4 always emits spaces around `>=`).
    out = out.replace(
      new RegExp(`@media\\s+\\(width\\s+>=\\s+${remStr.replace(".", "\\.")}rem\\)`, "g"),
      `@media (width >= __PH_BP_${key}__)`
    );

    // Tailwind px form (after a prior rewrite — keeps Tailwind's spaced form).
    // Requires `\s+` between `width` and `>=` so DaisyUI's no-space form falls
    // through to its own regex below and preserves its compact format.
    out = out.replace(
      new RegExp(`@media\\s+\\(width\\s+>=\\s+${fromPx}px\\)`, "g"),
      `@media (width >= __PH_BP_${key}__)`
    );

    // DaisyUI px form (`(width>=Xpx)`, no spaces around `>=`).
    out = out.replace(
      new RegExp(`@media\\s+\\(width>=${fromPx}px\\)`, "g"),
      `@media (width>=__PH_BD_${key}__)`
    );

    // Editor container form (Tailwind spaced).
    out = out.replace(
      new RegExp(`@container\\s+ph-editor-canvas\\s+\\(width\\s+>=\\s+${fromPx}px\\)`, "g"),
      `@container ph-editor-canvas (width >= __PH_BP_${key}__)`
    );

    // Editor container form (DaisyUI compact).
    out = out.replace(
      new RegExp(`@container\\s+ph-editor-canvas\\s+\\(width>=${fromPx}px\\)`, "g"),
      `@container ph-editor-canvas (width>=__PH_BD_${key}__)`
    );
  }

  // Pass 2: substitute placeholders with the target px values.
  for (const key of BP_KEYS) {
    const to = toBps[key];
    out = out.replace(new RegExp(`__PH_BP_${key}__`, "g"), `${to}px`);
    out = out.replace(new RegExp(`__PH_BD_${key}__`, "g"), `${to}px`);
  }

  return out;
}

/**
 * Editor-only: rewrite `@media (width >= Xpx)` → `@container ph-editor-canvas (width >= Xpx)`
 * so each canvas frame responds to its OWN container width, not the browser's.
 *
 * Must run AFTER rewriteBreakpoints (consumes its px output, not Tailwind's rem).
 * Handles both Tailwind spaced form and DaisyUI compact form.
 *
 * IMPORTANT: do NOT apply for /view, /static, custom domains — public renders
 * MUST keep `@media`. The editor canvas (#viewport) and any side-by-side
 * mirrors carry `container-type: inline-size; container-name: ph-editor-canvas`
 * so this query resolves identically to a browser-width media query for the
 * single-frame case but per-canvas for dual-frame.
 */
export function rewriteMediaToContainer(css: string): string {
  return (
    css
      // Tailwind: `@media (width >= 768px)` → `@container ph-editor-canvas (width >= 768px)`
      .replace(/@media\s+\(width\s+>=\s+(\d+)px\)/g, "@container ph-editor-canvas (width >= $1px)")
      // DaisyUI: `@media (width>=768px)` → `@container ph-editor-canvas (width>=768px)`
      .replace(/@media\s+\(width>=(\d+)px\)/g, "@container ph-editor-canvas (width>=$1px)")
  );
}

/**
 * Compile-time wrapper: rewrite from defaults to per-site breakpoints.
 * No-op when `bps` is undefined or every key matches defaults.
 *
 * `opts.editor` (Phase 3) — when true, ALSO rewrites `@media` →
 * `@container ph-editor-canvas` so the editor canvas (and any side-by-side
 * mirror frame) responds to its own width via CSS container queries instead
 * of the browser viewport.
 */
export function applyBreakpointRewrite(
  css: string,
  bps?: Record<string, number>,
  opts?: { editor?: boolean }
): string {
  let out = css;
  if (bps) {
    const merged: Record<BpKey, number> = {
      sm: bps.sm ?? DEFAULT_BREAKPOINTS_PX.sm,
      md: bps.md ?? DEFAULT_BREAKPOINTS_PX.md,
      lg: bps.lg ?? DEFAULT_BREAKPOINTS_PX.lg,
      xl: bps.xl ?? DEFAULT_BREAKPOINTS_PX.xl,
      "2xl": bps["2xl"] ?? DEFAULT_BREAKPOINTS_PX["2xl"],
    };
    out = rewriteBreakpoints(out, DEFAULT_BREAKPOINTS_PX, merged);
  } else if (opts?.editor) {
    // Editor without per-site overrides: still need to normalize Tailwind's
    // rem form to px BEFORE rewriting to @container, otherwise the regex
    // (which only handles px) would miss the unmodified rem media queries.
    out = rewriteBreakpoints(out, DEFAULT_BREAKPOINTS_PX, DEFAULT_BREAKPOINTS_PX);
    // rewriteBreakpoints early-returns on identical from/to maps — call the
    // pass-through path manually:
    out = rewritePxFormCanonicalize(out);
  }
  return opts?.editor ? rewriteMediaToContainer(out) : out;
}

/**
 * Internal: convert Tailwind's `@media (width >= Xrem)` form to its `Xpx`
 * equivalent so the @container rewrite regex can match. Used only by the
 * editor path when there are no per-site bp overrides (rewriteBreakpoints
 * would otherwise short-circuit and leave rem in place).
 */
function rewritePxFormCanonicalize(css: string): string {
  return css.replace(
    /@media\s+\(width\s+>=\s+([\d.]+)rem\)/g,
    (_m, rem) => `@media (width >= ${Math.round(parseFloat(rem) * 16)}px)`
  );
}
