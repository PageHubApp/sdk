/**
 * @pagehub/sdk — Server-side CSS compilation
 *
 * Adapts the app's compileTailwindCSS pipeline into the SDK.
 * Server-side only — requires Node.js (uses @tailwindcss/node and fs).
 *
 * Usage:
 * ```ts
 * import { compileCSS, buildStaticPage } from '@pagehub/sdk/compile-css';
 *
 * // Compile CSS for a set of classes (from renderToHTML().classes)
 * const css = await compileCSS({ classes: result.classes, themeCSS: result.themeCSS });
 *
 * // One-call: render + compile + assemble
 * const page = await buildStaticPage(compressedContent, { document: true });
 * ```
 *
 * Module layout:
 * - `api.ts`            — compileCSS / buildStaticPage / compileTailwindCSS (orchestration)
 * - `candidates.ts`     — Craft-tree → class-candidate scanner
 * - `compiler.ts`       — @tailwindcss/node lazy-import singleton
 * - `daisyui/`          — class→file map, component loader, rule pruner
 * - `assets/`           — theme / spatial / animation CSS file loaders
 * - `transforms/`       — layer unwrap, keyframe strip, minify (pure string ops)
 */

export { compileCSS, buildStaticPage, compileTailwindCSS } from "./api";
export { applyBreakpointRewrite, rewriteBreakpoints } from "../utils/breakpointRewrite";
