/** No compiled stylesheet may carry `--x: var(--x)`. Run: pnpm test:daisyui-toggle */
import test from "node:test";
import assert from "node:assert/strict";
import { compileCSS } from "../compile";
import { stripSelfReferencingVars } from "./stripSelfReferencingVars";

test("drops a declaration that points at its own name, keeps the rest", () => {
  const out = stripSelfReferencingVars(":root, :host { --a: 1; --radius-box: var(--radius-box); --b: var(--a); --c: var(--cc); }");
  assert.doesNotMatch(out, /--radius-box/);
  assert.match(out, /--a: 1;/);
  assert.match(out, /--b: var\(--a\);/);
  assert.match(out, /--c: var\(--cc\);/);
});

test("drops a fallback chain that loops back to its own name", () => {
  const out = stripSelfReferencingVars(":root{--font-sans: var(--sans-font-family, var(--font-sans));--x:1}");
  assert.doesNotMatch(out, /--font-sans/);
  assert.match(out, /--x:1/);
});

test("compiled CSS has no self-referencing custom property, and the site's radius is the one that resolves", async () => {
  const site = ":root { --radius-box: 0.75rem; --radius-field: 0.5rem; }";
  const css = await compileCSS({ classes: ["rounded-box", "rounded-field", "shadow-md", "font-sans", "rounded-selector"], themeCSS: site, lean: true });
  const selfRef = [...css.matchAll(/(--[\w-]+)\s*:\s*([^;}]*)/g)].filter(m => new RegExp(`var\\(\\s*${m[1]}\\s*[,)]`).test(m[2]));
  assert.deepEqual(selfRef.map(m => m[0]), []);
  assert.match(css, /--radius-box:\s*0\.75rem/);
  assert.match(css, /border-radius:\s*var\(--radius-box\)/);
});
