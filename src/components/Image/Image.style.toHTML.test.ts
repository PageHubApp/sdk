import test from "node:test";
import assert from "node:assert/strict";

import { toHTML as imageToHTML } from "./Image.toHTML";
import { toHTML as linkToHTML } from "../Link/Link.toHTML";
import { toHTML as buttonToHTML } from "../Button/Button.toHTML";

// `root.style` is applied by the React bodies (Image.body / applyAnimation);
// the static walker must emit the same inline style or it vanishes on
// staticPublish sites and the /view static document.

const mk = (): any => ({
  classes: new Set<string>(),
  pageIndex: {},
  currentPath: "/",
  nodes: { ROOT: { props: {} } },
});

const root = { style: "color:red" };

test("Image <img> carries root.style", () => {
  const html = imageToHTML({ type: "url", src: "https://example.com/a.png", root }, "", mk());
  assert.match(html, /^<img /, html);
  assert.match(html, /style="color: red"/, html);
});

test("Image inline SVG keeps its centering and appends root.style", () => {
  const html = imageToHTML({ type: "svg", src: "<svg></svg>", root }, "", mk());
  assert.match(
    html,
    /style="display: flex; align-items: center; justify-content: center; color: red"/,
    html
  );
});

test("Image without root.style emits no style attr", () => {
  const html = imageToHTML({ type: "url", src: "https://example.com/a.png" }, "", mk());
  assert.doesNotMatch(html, /style=/, html);
});

test("Link carries root.style", () => {
  const html = linkToHTML({ text: "Go", action: [{ type: "link", href: "/x" }], root }, "", mk());
  assert.match(html, /^<a /, html);
  assert.match(html, /style="color: red"/, html);
});

test("Button (as <a>) carries root.style", () => {
  const html = buttonToHTML({ text: "Go", action: [{ type: "link", href: "/x" }], root }, "", mk());
  assert.match(html, /^<a /, html);
  assert.match(html, /style="color: red"/, html);
});

test("Button (as <button>) carries root.style", () => {
  const html = buttonToHTML({ text: "Go", root }, "", mk());
  assert.match(html, /^<button /, html);
  assert.match(html, /style="color: red"/, html);
});
