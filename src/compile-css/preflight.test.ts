/**
 * `preflight` — the per-site switch for Tailwind's preflight reset (`--ph-preflight` in theme.css). An imported site
 * written against the browser's defaults turns it off, so `p { margin: 0 }` and `line-height: 1.5` don't move its
 * text. Utilities compile either way.
 *
 * Run: pnpm exec tsx --conditions=pagehub-source --test packages/sdk/src/compile-css/preflight.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { compileCSS } from "./compile";

const CLASSES = ["text-red-500", "flex"];
/** Preflight's own markers: the text-size-adjust on html and the `hr` reset. */
const PREFLIGHT = /text-size-adjust/;

test("preflight ships by default", async () => {
  const css = await compileCSS({ classes: CLASSES, themeCSS: "" });
  assert.match(css, PREFLIGHT);
  assert.match(css, /\.text-red-500\s*\{/);
});

test("preflight: false leaves the reset out and keeps the utilities", async () => {
  const css = await compileCSS({ classes: CLASSES, themeCSS: "", preflight: false });
  assert.doesNotMatch(css, PREFLIGHT);
  assert.match(css, /\.text-red-500\s*\{/);
  assert.match(css, /\.flex\s*\{\s*display:\s*flex/);
});
