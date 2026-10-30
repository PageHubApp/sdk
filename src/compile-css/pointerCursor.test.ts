/**
 * Clickable controls get a pointer cursor on every site: Tailwind v4's preflight leaves a button without DaisyUI's `btn`
 * on the browser's default cursor. The rule has no specificity, so a `cursor-*` class still wins.
 *
 * Run: pnpm exec tsx --conditions=pagehub-source --test packages/sdk/src/compile-css/pointerCursor.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import { compileCSS } from "./compile";

const CLASSES = ["flex"];

/** The compiled rule's selector list and its `cursor` declaration. */
function pointerRule(css: string): string | undefined {
  return css.match(/:where\([^{}]*\)\s*\{\s*cursor:\s*pointer;?\s*\}/)?.[0];
}

test("every kind of clickable control is in the rule", async () => {
  const rule = pointerRule(await compileCSS({ classes: CLASSES, themeCSS: "" }));
  assert.ok(rule, "the pointer cursor rule is missing from the compiled CSS");
  for (const control of ["button", "select", "summary", "role=", "[commandfor]", "[popovertarget]", "label:has(", "checkbox", "radio", "submit"]) {
    assert.ok(rule.includes(control), `missing ${control}`);
  }
});

test("disabled controls keep the default cursor", async () => {
  const rule = pointerRule(await compileCSS({ classes: CLASSES, themeCSS: "" }));
  assert.match(rule ?? "", /button:not\(:disabled\)/);
  assert.match(rule ?? "", /select:not\(:disabled\)/);
});

test("a cursor utility still compiles alongside it", async () => {
  const css = await compileCSS({ classes: ["cursor-not-allowed"], themeCSS: "" });
  assert.ok(pointerRule(css));
  assert.match(css, /\.cursor-not-allowed\s*\{\s*cursor:\s*not-allowed/);
});

test("a site with preflight off keeps the browser's defaults", async () => {
  const css = await compileCSS({ classes: CLASSES, themeCSS: "", preflight: false });
  assert.equal(pointerRule(css), undefined);
});
