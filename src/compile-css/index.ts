/**
 * @pagehub/sdk — Server-side CSS compilation
 *
 * Server-side only — requires Node.js (uses @tailwindcss/node and fs).
 *
 * ```ts
 * import { compileCSS } from '@pagehub/sdk/compile-css';
 *
 * const css = await compileCSS({ classes, themeCSS });
 * ```
 *
 * Module layout:
 * - `compile.ts`        — compileCSS (orchestration)
 * - `compiler.ts`       — @tailwindcss/node lazy-import singleton
 * - `daisyui/`          — class→file map, component loader, rule pruner
 * - `assets/`           — theme / spatial / animation CSS file loaders
 * - `transforms/`       — layer unwrap, keyframe strip, minify (pure string ops)
 */

export { compileCSS } from "./compile";
export { applyBreakpointRewrite, rewriteBreakpoints } from "../utils/breakpointRewrite";
