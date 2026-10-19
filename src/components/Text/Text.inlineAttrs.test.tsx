import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RouterContext } from "next/dist/shared/lib/router-context.shared-runtime";
import { renderTextBody } from "./Text.body";
import { toHTML } from "./Text.toHTML";
import { makeWalkerCtx } from "../../render/react/RenderCtx";

// Inline tags inside Text html keep `id` / `data-*` / `aria-*` on both walkers.
// An imported footer `© <span id="year"></span>` is written to by the site's
// own script (`getElementById("year")`); losing the id throws and stops it.

const TEXT =
  // guard-allow: nav — sample Text html under test, not app navigation
  '© <span id="year"></span> Example Co. <a href="/terms" data-track="terms" aria-label="Terms of use">Terms</a>';

const staticHtml = (text: string) =>
  toHTML({ tagName: "p", text }, "", {
    classes: new Set<string>(),
    pageIndex: {},
    currentPath: "/",
    nodes: { ROOT: { props: {} } },
  } as any) as string;

function reactHtml(text: string) {
  const ctx = makeWalkerCtx({
    id: "t1",
    isCanvas: false,
    hasChildNodes: false,
    displayName: "Text",
    rootProps: {},
    pageMedia: null,
    pageIndex: {},
  });
  const Probe = () => renderTextBody({ tagName: "p", text }, ctx) as React.ReactElement;
  return renderToStaticMarkup(
    <RouterContext.Provider value={{ asPath: "/" } as any}>
      <Probe />
    </RouterContext.Provider>
  );
}

for (const [name, render] of [
  ["static", staticHtml],
  ["react", reactHtml],
] as const) {
  test(`${name}: inline id / data-* / aria-* survive`, () => {
    const html = render(TEXT);
    assert.match(html, /<span id="year"><\/span>/, html);
    assert.match(html, /<a href="\/terms" data-track="terms" aria-label="Terms of use">Terms<\/a>/, html);
  });
}
