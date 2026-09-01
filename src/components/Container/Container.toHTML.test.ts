import test from "node:test";
import assert from "node:assert/strict";

import { toHTML } from "./Container.toHTML";

// PageIndex is Record<pageId, { isHomePage?, displayName }> — slugs are derived
// from displayName by resolvePageRef, not stored.
const pageIndex = {
  page_home: { isHomePage: true, displayName: "Home" },
  page_smog_check_location: { displayName: "Smog Check Location" },
};

const mk = (): any => ({
  classes: new Set<string>(),
  pageIndex,
  currentPath: "/",
  nodes: { ROOT: { props: {} } },
});

test("div container with a ref: link action renders as <a href>", () => {
  const html = toHTML(
    { className: "flex items-baseline", action: [{ type: "link", href: "ref:page_home" }] },
    "<span>Brand</span>",
    mk()
  );
  assert.match(html, /^<a /, `expected an anchor, got: ${html.slice(0, 160)}`);
  assert.match(html, /href="\/"/, `expected href="/", got: ${html.slice(0, 200)}`);
});

test("external link gets target + rel", () => {
  const html = toHTML(
    { action: [{ type: "link", href: "https://example.com", target: "_blank" }] },
    "x",
    mk()
  );
  assert.match(html, /^<a /);
  assert.match(html, /href="https:\/\/example\.com"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /target="_blank"/);
});

test("the full action chain still ships as data-ph-actions alongside the href", () => {
  const html = toHTML(
    {
      action: [
        { type: "copy-to-clipboard", text: "ABC" },
        { type: "link", href: "ref:page_smog_check_location" },
      ],
    },
    "x",
    mk()
  );
  assert.match(html, /data-ph-actions=/);
  assert.match(html, /href="\/smog-check-location"/, `got: ${html.slice(0, 240)}`);
});

test("semantic containers are NOT upgraded", () => {
  for (const type of ["section", "header", "nav", "footer", "li", "form"]) {
    const html = toHTML({ type, action: [{ type: "link", href: "ref:page_home" }] }, "x", mk());
    assert.match(
      html,
      new RegExp(`^<${type}[ >]`),
      `${type} should stay <${type}>: ${html.slice(0, 100)}`
    );
  }
});

test("a div whose actions are all JS-handled stays a div", () => {
  const html = toHTML({ action: [{ type: "toggle-cart" }] }, "x", mk());
  assert.match(html, /^<div/);
  assert.doesNotMatch(html, /href=/);
});

test("mailto/tel hrefs pass through without rel", () => {
  const html = toHTML({ action: [{ type: "link", href: "tel:+18185001770" }] }, "x", mk());
  assert.match(html, /^<a /);
  assert.match(html, /href="tel:\+18185001770"/);
  assert.doesNotMatch(html, /rel=/);
});

test("an unresolvable ref falls back to href='#' — same as Button and the React viewer", () => {
  // resolvePageRef returns "#" for an unknown pageId. Button.toHTML and
  // Container.viewerBody both render an anchor on that value, so static
  // matching them keeps one behaviour across all three paths.
  const html = toHTML({ action: [{ type: "link", href: "ref:page_missing" }] }, "x", mk());
  assert.match(html, /^<a /);
  assert.match(html, /href="#"/);
});
