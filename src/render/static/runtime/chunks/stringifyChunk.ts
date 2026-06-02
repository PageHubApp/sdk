/**
 * Convert a real TS/JS function into the string of statements that lived
 * inside its body. Returned text is concatenated into the static-publish
 * IIFE in `staticPublishRuntime.ts` — so the body executes in that outer
 * scope, where preamble globals (`Alpine`, `PAGE_ID`, `__phRT`, ...) all
 * resolve.
 *
 * Authoring chunks as functions means tsc, the editor, eslint, and refactor
 * tools all treat them as real code. Globals are declared in
 * `runtime-globals.d.ts`. No backtick-strings of "trust me it's JS".
 *
 * Cross-chunk function sharing
 * ----------------------------
 * Each chunk's body is independently minified by the consumer's bundler
 * (SWC under Next, esbuild/terser under Vite). Internal function
 * declarations get renamed to single letters (e.g. `setState` → `e`). Two
 * chunks can't share function references by identifier — caller chunk's
 * `setState(...)` would be `undefined` in the runtime IIFE because the
 * definer chunk renamed its `setState` to `e`. Fix: definer chunks publish
 * to the shared `__phRT` registry via STRING property names (which
 * minifiers don't mangle); caller chunks destructure from `__phRT` at the
 * top of their body. See `staticPublishRuntime.ts` preamble.
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
  // Wrap in a block to give each chunk its own scope. Required because the
  // registry-pattern destructures (`const { setState, ... } = __phRT`) at the
  // top of each chunk body, which SWC/esbuild minify to `let{setState:e,...}=`.
  // Multiple chunks declaring `let e` as siblings in the outer IIFE collide
  // with `Identifier 'e' has already been declared`. A `{}` block per chunk
  // gives each destructure its own scope. Cross-chunk references go through
  // `__phRT` (outer-scope var), not through function-decl hoisting — so block
  // scope is safe.
  return "{" + src.slice(open + 1, close) + "}";
}
