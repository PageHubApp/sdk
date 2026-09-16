import test from "node:test";
import assert from "node:assert/strict";

import { toHTML } from "./Text.toHTML";

// The React viewer strips TipTap's `<p>` wrapper (Text.body.tsx → unwrapP).
// The static exporter must emit the same markup, or a site with
// `staticPublish: true` renders `<span><p>…</p></span>` — invalid nesting with
// a different box than /view shows.

const pageIndex = { page_home: { isHomePage: true, displayName: "Home" } };

const mk = (): any => ({
  classes: new Set<string>(),
  pageIndex,
  currentPath: "/",
  nodes: { ROOT: { props: {} } },
});

test("span Text drops the <p> wrapper", () => {
  const html = toHTML({ tagName: "span", className: "block", text: "<p>Services ▾</p>" }, "", mk());
  assert.equal(html, '<span class="block">Services ▾</span>');
});

test("multiple paragraphs collapse to <br/><br/>, same as the React viewer", () => {
  const html = toHTML({ tagName: "div", text: "<p>One</p><p>Two</p>" }, "", mk());
  assert.equal(html, "<div>One<br/><br/>Two</div>");
});

test("linked Text drops the <p> inside the <a>", () => {
  const html = toHTML(
    { tagName: "span", text: "<p>Home</p>", action: [{ type: "link", href: "ref:page_home" }] },
    "",
    mk()
  );
  assert.doesNotMatch(html, /<p>/, `expected no <p>, got: ${html}`);
  assert.match(html, /<a href="\/">Home<\/a>/, `got: ${html}`);
});

test("markup that isn't a single <p> wrapper is left alone", () => {
  const html = toHTML({ tagName: "div", text: "<h2>Title</h2><p>Body</p>" }, "", mk());
  assert.equal(html, "<div><h2>Title</h2><p>Body</p></div>");
});
