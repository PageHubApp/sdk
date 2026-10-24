/**
 * `theme.daisyui` — the per-site switch for DaisyUI component styles.
 * Off: the compile ships no DaisyUI component CSS. On / unset: unchanged.
 * Spec: docs/features/daisyui-toggle.md
 *
 * Run: pnpm test:daisyui-toggle
 */
import test from "node:test";
import assert from "node:assert/strict";
import { compileCSS } from "./compile";
import { resolveTheme } from "../utils/design/resolveTheme";

const CLASSES = ["hero", "hero-content", "min-h-96", "btn", "btn-primary", "px-4"];

/** A DaisyUI component rule for `cls` — `.btn{…}`, not a spatial `.btn:where(…)`. */
const componentRule = (cls: string) => new RegExp(`\\.${cls}\\s*\\{`);
/** DaisyUI's `.hero-content` (the spatial override sets no `isolation`). */
const HERO_CONTENT = /\.hero-content\s*\{[^}]*isolation:isolate/;

test("unset and true keep DaisyUI on", () => {
  assert.equal(resolveTheme({}).daisyui, true);
  assert.equal(resolveTheme({ theme: { daisyui: true } }).daisyui, true);
  assert.equal(resolveTheme({ theme: { daisyui: false } }).daisyui, false);
});

test("on: a `hero btn` page ships DaisyUI's hero and button CSS", async () => {
  for (const daisyui of [undefined, true]) {
    const css = await compileCSS({ classes: CLASSES, daisyui, lean: true });
    assert.match(css, HERO_CONTENT, "hero.css");
    assert.match(css, componentRule("btn"), "button.css");
    assert.match(css, componentRule("btn-primary"), "btn-primary");
    assert.match(css, /\.px-4\s*\{/, "utilities still compile");
  }
});

test("off: no DaisyUI component CSS; utilities still compile", async () => {
  const css = await compileCSS({ classes: CLASSES, daisyui: false, lean: true });
  assert.doesNotMatch(css, HERO_CONTENT);
  assert.doesNotMatch(css, componentRule("btn"));
  assert.doesNotMatch(css, componentRule("btn-primary"));
  assert.match(css, /\.px-4\s*\{/);
  assert.match(css, /\.min-h-96\s*\{/);
  // The spatial overrides only retune DaisyUI's components: off, they're left out (a site's own `.navbar` keeps its height).
  assert.ok(!css.includes('[data-daisyui="off"] *'));
  assert.match(css, /--space-sm/, "the spatial scale itself still ships");
});

test("on: the spatial overrides ship", async () => {
  const css = await compileCSS({ classes: CLASSES, lean: true });
  assert.ok(css.includes('.hero-content:where(:not([data-daisyui="off"] *))'));
});

test("canvasScoped: DaisyUI rules sit under a scope the off switch excludes", async () => {
  const css = await compileCSS({ classes: CLASSES, editor: true, canvasScoped: true });
  assert.ok(css.includes('@scope (:root) to ([data-daisyui="off"])'));
  assert.match(css, HERO_CONTENT);
  const plain = await compileCSS({ classes: CLASSES, editor: true });
  assert.ok(!plain.includes("@scope"), "unscoped callers get plain rules");
});
