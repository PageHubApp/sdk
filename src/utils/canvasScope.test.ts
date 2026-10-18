import assert from "node:assert/strict";
import { test } from "node:test";

import { CANVAS_SCOPE_SELECTOR, scopeCss, splitTopLevel } from "./canvasScope";

test("splitTopLevel separates rules, blocks and statements", () => {
  const css = `@layer theme, base;/* c { } */.a{color:red}@media (width>=1px){.b{x:"}"}}@import "x.css";`;
  assert.deepEqual(splitTopLevel(css), [
    "@layer theme, base;",
    ".a{color:red}",
    '@media (width>=1px){.b{x:"}"}}',
    '@import "x.css";',
  ]);
});

test("scopeCss wraps selector rules and keeps non-selector at-rules global", () => {
  const out = scopeCss(
    `@property --tw-x{syntax:"*";inherits:false}.hidden{display:none}@keyframes spin{to{rotate:1turn}}@layer utilities{.flex{display:flex}}`
  );
  assert.ok(out.includes(`@property --tw-x{syntax:"*";inherits:false}`));
  assert.ok(out.includes("@keyframes spin{to{rotate:1turn}}"));
  const scope = out.slice(out.indexOf("@scope"));
  assert.ok(scope.startsWith(`@scope (${CANVAS_SCOPE_SELECTOR}){`));
  assert.ok(scope.includes(".hidden{display:none}"));
  assert.ok(scope.includes("@layer utilities{.flex{display:flex}}"));
  assert.ok(!scope.includes("@keyframes"));
});

test("scopeCss points document selectors at the scope root", () => {
  const out = scopeCss(`:root,:host{--a:1}html{line-height:1.5}body{margin:0}.htmlish{x:1}`);
  assert.ok(out.includes(":scope,:scope{--a:1}"));
  assert.ok(out.includes(":scope{line-height:1.5}"));
  assert.ok(out.includes(":scope{margin:0}"));
  assert.ok(out.includes(".htmlish{x:1}"));
});

test("scopeCss is idempotent and leaves empty input alone", () => {
  const once = scopeCss(".a{b:c}");
  assert.equal(scopeCss(once), once);
  assert.equal(scopeCss(""), "");
});
