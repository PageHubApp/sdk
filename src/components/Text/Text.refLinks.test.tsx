import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RouterContext } from "next/dist/shared/lib/router-context.shared-runtime";
import { renderTextBody } from "./Text.body";
import { toHTML } from "./Text.toHTML";
import { makeWalkerCtx } from "../../render/react/RenderCtx";
import { ItemProvider } from "../../utils/itemContext";

// Internal page links inside Text rich-text HTML (`<a href="ref:<pageId>">`,
// written by the inline link tool and by importers) resolve to the same URL a
// `link` action produces, on both walkers.

const pageIndex = {
  page_home: { isHomePage: true, displayName: "Home" },
  page_about: { displayName: "About" },
  page_services: { displayName: "Services" },
};
const PREVIEW = "/view/site1/services";

const staticHtml = (text: string, currentPath = PREVIEW, currentItem?: any) =>
  toHTML({ tagName: "div", text }, "", {
    classes: new Set<string>(),
    pageIndex,
    currentPath,
    currentItem,
    nodes: { ROOT: { props: {} } },
  } as any) as string;

function reactHtml(text: string, asPath = PREVIEW, item?: Record<string, any>) {
  const ctx = makeWalkerCtx({
    id: "t1",
    isCanvas: false,
    hasChildNodes: false,
    displayName: "Text",
    rootProps: {},
    pageMedia: null,
    pageIndex,
  });
  const Probe = () => renderTextBody({ tagName: "div", text }, ctx) as React.ReactElement;
  const tree = (
    <RouterContext.Provider value={{ asPath } as any}>
      <Probe />
    </RouterContext.Provider>
  );
  return renderToStaticMarkup(
    item ? (
      <ItemProvider item={item} index={0}>
        {tree}
      </ItemProvider>
    ) : (
      tree
    )
  );
}

const both = (name: string, fn: (render: typeof staticHtml) => void) => {
  test(`static: ${name}`, () => fn(staticHtml));
  test(`react: ${name}`, () => fn((t, p, item) => reactHtml(t, p, item)));
};

both("ref link resolves to the preview page path", render => {
  const html = render('<p>See <a href="ref:page_about">about us</a></p>');
  assert.match(html, /<a href="\/view\/site1\/about">about us<\/a>/, html);
});

both("ref link on a custom domain resolves to the bare slug", render => {
  const html = render('<p><a href="ref:page_about">About</a></p>', "/services");
  assert.match(html, /<a href="\/about">About<\/a>/, html);
});

both("home page ref, suffix, query and hash forms", render => {
  const html = render(
    '<a href="ref:page_home">h</a><a href="ref:page_services/roofing?x=1#top">s</a><a href="ref:page_about/#team">a</a>'
  );
  assert.match(html, /href="\/view\/site1">h</, html);
  assert.match(html, /href="\/view\/site1\/services\/roofing\?x=1#top">s</, html);
  assert.match(html, /href="\/view\/site1\/about#team">a</, html);
});

both("unknown page resolves to #", render => {
  const html = render('<a href="ref:page_gone">x</a>');
  assert.match(html, /<a href="#">x<\/a>/, html);
});

both("external, mailto, tel, sms, anchor and relative links are untouched", render => {
  const src =
    '<a href="https://example.com">e</a><a href="mailto:a@b.co">m</a><a href="tel:+1555">t</a>' +
    // guard-allow: nav — rich-text fixture string, not rendered markup
    '<a href="sms:+1555">s</a><a href="#faq">f</a><a href="/contact">c</a>';
  const html = render(src);
  for (const href of [
    "https://example.com",
    "mailto:a@b.co",
    "tel:+1555",
    "sms:+1555",
    "#faq",
    "/contact",
  ]) {
    assert.ok(html.includes(`href="${href}"`), `${href} missing in ${html}`);
  }
});

both("{{item.*}} inside a ref link interpolates, then resolves", render => {
  const html = render('<a href="ref:page_services/{{item.slug}}">more</a>', PREVIEW, {
    slug: "gutters",
  });
  assert.match(html, /<a href="\/view\/site1\/services\/gutters">more<\/a>/, html);
});
