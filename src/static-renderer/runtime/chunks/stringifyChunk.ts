/**
 * Convert a real TS/JS function into the string of statements that lived
 * inside its body. Returned text is concatenated into the static-publish
 * IIFE in `staticPublishRuntime.ts` — so the body executes in that outer
 * scope, where preamble globals (`Alpine`, `PAGE_ID`, ...) and cross-chunk
 * helpers (`setState`, `setVisibility`, `fireAnalytics`, ...) all resolve.
 *
 * Authoring chunks as functions means tsc, the editor, eslint, and refactor
 * tools all treat them as real code. Globals are declared in
 * `runtime-globals.d.ts`. No backtick-strings of "trust me it's JS".
 *
 * Notes
 * - `.toString()` returns the function's source AFTER bundler transforms.
 *   SWC / Turbopack / Vite all preserve the body text (they rename inner
 *   locals at worst, which is still valid JS). TS-only syntax has already
 *   been erased, so the output is plain JS.
 * - The returned string is the BODY only — no `function $f(){}` wrapper —
 *   so behavior matches the prior raw-template chunks 1:1.
 */
export function stringifyChunk(fn: () => void): string {
  const src = fn.toString();
  const open = src.indexOf("{");
  const close = src.lastIndexOf("}");
  if (open < 0 || close <= open) {
    throw new Error("stringifyChunk: could not find function body braces");
  }
  return src.slice(open + 1, close);
}
