import test from "node:test";
import assert from "node:assert/strict";

import { toHTML } from "./Button.toHTML";

const mk = (): any => ({
  classes: new Set<string>(),
  pageIndex: {},
  currentPath: "/",
  nodes: { ROOT: { props: {} } },
});

test("a utility-styled button gets a pointer cursor", () => {
  const ctx = mk();
  const html = toHTML(
    { text: "Get a quote", className: "inline-flex bg-accent px-space-md" },
    "",
    ctx
  );
  assert.match(html, /class="[^"]*\bcursor-pointer\b/, html);
  assert.ok(ctx.classes.has("cursor-pointer"), "cursor-pointer must compile");
});

test("a DaisyUI btn keeps its own cursor", () => {
  const html = toHTML({ text: "Go", className: "btn btn-primary" }, "", mk());
  assert.doesNotMatch(html, /cursor-pointer/, html);
});

test("an author's cursor class wins", () => {
  const html = toHTML({ text: "Wait", className: "inline-flex cursor-wait" }, "", mk());
  assert.doesNotMatch(html, /cursor-pointer/, html);
  assert.match(html, /cursor-wait/);
});
