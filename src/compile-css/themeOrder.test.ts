/**
 * A site's own `:root` tokens beat the SDK default palette that the compile ships after the utilities, whatever
 * the order. Run: pnpm test:daisyui-toggle
 */
import test from "node:test";
import assert from "node:assert/strict";
import { compileCSS } from "./compile";
import { lowerDefaultRootSpecificity } from "./compiler";

test("lowerDefaultRootSpecificity rewrites a block-start :root only", () => {
  const out = lowerDefaultRootSpecificity(":root {\n  --a: 1;\n}\n.dark :root, :root.dark {\n  --a: 2;\n}\nhtml:root{--b:1}");
  assert.ok(out.startsWith(":where(:root) {"));
  assert.ok(out.includes(".dark :root, :root.dark {"));
  assert.ok(out.includes("html:root{"));
});

test("the compile's default palette carries no specificity, so the site's :root wins", async () => {
  const site = ":root { --primary: oklch(49% 0.07 135); }";
  const css = await compileCSS({ classes: ["bg-primary"], themeCSS: site, lean: true });
  assert.match(css, /^:root\s*\{\s*--primary:\s*oklch\(49% 0\.07 135\)/, "the site's block is first and unchanged");
  assert.doesNotMatch(css, /(^|[}\s]):root\s*\{[^}]*--primary:\s*oklch\(14% 0 0\)/, "no bare :root default palette left");
  assert.match(css, /:where\(:root\)\s*\{[^}]*--primary:\s*oklch\(14% 0 0\)/, "the default palette is :where(:root)");
});
