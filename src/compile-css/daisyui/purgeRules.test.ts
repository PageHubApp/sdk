/**
 * `purgeDaisyUIRules` — the SSR compile's DaisyUI pruner.
 * Every DaisyUI component file opens with a license comment
 * (`/*! 🌼 daisyUI 5.7.0 - MIT License *\/`). It must not be read as part of
 * the first rule's selector, or that rule (the base `.hero`, `.card`, …) never
 * ships. Spec: docs/features/daisyui-toggle.md
 *
 * Run: pnpm test:daisyui-toggle
 */
import test from "node:test";
import assert from "node:assert/strict";
import { purgeDaisyUIRules } from "./purgeRules";
import { compileCSS } from "../api";

test("a license comment doesn't count as part of the first selector", () => {
  const css = "/*! 🌼 daisyUI 5.7.0 - MIT License */ .hero { display:grid } .hero-content { gap:1rem }";
  const out = purgeDaisyUIRules(css, new Set(["hero"]));
  assert.match(out, /\.hero\s*\{\s*display:grid/);
  assert.doesNotMatch(out, /hero-content/);
});

test("a comment before an at-rule doesn't hide it", () => {
  const css = "/* x 1.2 */ @media (width>=640px) { .hero { display:grid } }";
  const out = purgeDaisyUIRules(css, new Set(["hero"]));
  assert.match(out, /@media \(width>=640px\) \{\s*\.hero/);
});

test("a `hero` page ships DaisyUI's base `.hero` rule", async () => {
  const css = await compileCSS({ classes: ["hero"] });
  assert.match(css, /\.hero\s*\{[^}]*display:grid/);
});

test("the base rule of every component file survives for its own class", async () => {
  for (const cls of ["card", "navbar", "footer", "badge", "divider", "menu", "input", "alert"]) {
    const css = await compileCSS({ classes: [cls] });
    assert.match(css, new RegExp(`(^|[\\s}])\\.${cls}\\s*\\{`), cls);
  }
});
