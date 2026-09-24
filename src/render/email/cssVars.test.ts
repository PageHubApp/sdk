import test from "node:test";
import assert from "node:assert/strict";
import { collectRootVars, resolveCssVars, resolveVarsInValue } from "./cssVars";

const squash = (css: string) => css.replace(/\s+/g, "");

test("resolveCssVars: an override wins over a later :root", () => {
  const css = `:root{--primary:red} .a{color:var(--primary)} :root{--primary:blue}`;
  assert.equal(squash(resolveCssVars(css, {})), ".a{color:blue}");
  assert.equal(squash(resolveCssVars(css, { "--primary": "#0065cc" })), ".a{color:#0065cc}");
});

test("resolveCssVars: nested vars resolve recursively", () => {
  const css = `:root{--density:1;--space:calc(2rem * var(--density))} .a{padding:var(--space)}`;
  assert.equal(squash(resolveCssVars(css, {})), ".a{padding:calc(2rem*1)}");
});

test("resolveCssVars: a missing var uses its fallback, else the declaration is dropped", () => {
  const css = `.a{line-height:var(--tw-leading, var(--lh)); color:var(--nope); margin:0} :root{--lh:1.5}`;
  assert.equal(squash(resolveCssVars(css, {})), ".a{line-height:1.5;margin:0}");
});

test("resolveCssVars: a cycle falls back or drops", () => {
  const css = `:root{--a:var(--b);--b:var(--a)} .x{color:var(--a, red)} .y{color:var(--a)}`;
  assert.equal(squash(resolveCssVars(css, {})), ".x{color:red}");
});

test("resolveCssVars: removes :root / @property / --* and seeds from @property initial-value", () => {
  const css = `@property --tw-border-style{syntax:"*";inherits:false;initial-value:solid}
    :root,:host{--x:1px} .b{--local:2px;border-style:var(--tw-border-style);border-width:var(--x)}`;
  assert.equal(squash(resolveCssVars(css, {})), ".b{border-style:solid;border-width:1px}");
});

test("resolveVarsInValue: resolves every var in a value", () => {
  const vars = { "--a": "1px", "--b": "solid" };
  assert.equal(resolveVarsInValue("var(--a) var(--b) red", vars), "1px solid red");
  assert.equal(resolveVarsInValue("color-mix(in oklab, var(--a) 70%, transparent)", vars),
    "color-mix(in oklab, 1px 70%, transparent)");
});

test("collectRootVars: reads the site theme block", () => {
  const theme = `:root {\n  --primary: oklch(52% 0.19 256);\n  --radius: 12px;\n}\n.ph-icon-svg{width:1em}`;
  assert.deepEqual(collectRootVars(theme), { "--primary": "oklch(52% 0.19 256)", "--radius": "12px" });
});
