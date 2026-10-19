/**
 * `theme.daisyui` — the per-site switch for DaisyUI component styles.
 * Off: the SSR compile ships no DaisyUI component CSS and the site root carries
 * `data-daisyui="off"` (which gates the daisyui-spatial overrides). On / unset:
 * unchanged. Spec: docs/features/daisyui-toggle.md
 *
 * Run: pnpm test:daisyui-toggle
 */
import test from "node:test";
import assert from "node:assert/strict";
import { compileTailwindCSS } from "./api";
import { renderToHTML } from "../render/static/renderToHTML";
import { resolveTheme } from "../utils/design/resolveTheme";

function page(theme: Record<string, unknown> | undefined): string {
  return JSON.stringify({
    ROOT: {
      type: { resolvedName: "Background" },
      isCanvas: true,
      props: { type: "background", className: "min-h-dvh w-full", ...(theme ? { theme } : {}) },
      parent: null,
      nodes: ["hero"],
    },
    hero: {
      type: { resolvedName: "Container" },
      isCanvas: true,
      props: { className: "hero hero-content min-h-96" },
      parent: "ROOT",
      nodes: ["cta"],
    },
    cta: {
      type: { resolvedName: "Container" },
      isCanvas: true,
      props: { className: "btn btn-primary px-4" },
      parent: "hero",
      nodes: [],
    },
  });
}

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
  for (const theme of [undefined, { daisyui: true }]) {
    const css = (await compileTailwindCSS(page(theme))) ?? "";
    assert.match(css, HERO_CONTENT, "hero.css");
    assert.match(css, componentRule("btn"), "button.css");
    assert.match(css, componentRule("btn-primary"), "btn-primary");
    assert.match(css, /\.px-4\s*\{/, "utilities still compile");
  }
});

test("off: no DaisyUI component CSS; utilities and theme vars still compile", async () => {
  const css = (await compileTailwindCSS(page({ daisyui: false }))) ?? "";
  assert.doesNotMatch(css, HERO_CONTENT);
  assert.doesNotMatch(css, componentRule("btn"));
  assert.doesNotMatch(css, componentRule("btn-primary"));
  assert.match(css, /\.px-4\s*\{/);
  assert.match(css, /\.min-h-96\s*\{/);
  // The spatial overrides stay in the sheet but can't match under the off root.
  assert.ok(css.includes('.hero-content:where(:not([data-daisyui="off"] *))'));
});

test("the static root carries data-daisyui=off only when it's off", () => {
  const off = renderToHTML(page({ daisyui: false }), { compressed: false });
  assert.match(off.html, /<main[^>]*data-daisyui="off"/);
  assert.equal(off.daisyui, false);
  const on = renderToHTML(page(undefined), { compressed: false });
  assert.doesNotMatch(on.html, /data-daisyui/);
  assert.equal(on.daisyui, true);
});

test("canvasScoped: DaisyUI rules sit under a scope the off switch excludes", async () => {
  const css = (await compileTailwindCSS(page(undefined), { editor: true, canvasScoped: true })) ?? "";
  assert.ok(css.includes('@scope (:root) to ([data-daisyui="off"])'));
  assert.match(css, HERO_CONTENT);
  const plain = (await compileTailwindCSS(page(undefined), { editor: true })) ?? "";
  assert.ok(!plain.includes("@scope"), "unscoped callers get plain rules");
});
