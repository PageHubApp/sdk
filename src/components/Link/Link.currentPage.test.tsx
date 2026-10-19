import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RouterContext } from "next/dist/shared/lib/router-context.shared-runtime";
import { renderLinkBody } from "./Link.body";
import { toHTML as linkToHTML } from "./Link.toHTML";
import { renderButtonBody } from "../Button/Button.body";
import { toHTML as buttonToHTML } from "../Button/Button.toHTML";
import { makeWalkerCtx } from "../../render/react/RenderCtx";
import type { PageIndex } from "../../utils/page/pageManagement";

// A nav Link / Button pointing at the page being rendered carries
// `aria-current="page"` + `data-active="true"` on BOTH walkers, so menus
// styled with `aria-[current=page]:` highlight on static-published sites too.

const pageIndex: PageIndex = {
  page_home: { displayName: "Home", isHomePage: true },
  page_about: { displayName: "About" },
  page_car: { displayName: "Car" },
};

type Body = (props: any, ctx: any) => unknown;
type ToHTML = (props: any, children: string, ctx: any) => unknown;

const COMPONENTS: [string, Body, ToHTML][] = [
  ["Link", renderLinkBody, linkToHTML],
  ["Button", renderButtonBody, buttonToHTML],
];

const props = (href: string) => ({ text: "Item", action: [{ type: "link", href }] });

function staticHtml(toHTML: ToHTML, href: string, currentPath: string) {
  return toHTML(props(href), "", {
    classes: new Set<string>(),
    pageIndex,
    currentPath,
    nodes: { ROOT: { props: {} } },
  }) as string;
}

function reactHtml(body: Body, href: string, asPath: string) {
  const ctx = makeWalkerCtx({
    id: "n1",
    isCanvas: false,
    hasChildNodes: false,
    displayName: "Link",
    rootProps: {},
    pageMedia: null,
    pageIndex,
  });
  const Probe = () => body(props(href), ctx) as React.ReactElement;
  return renderToStaticMarkup(
    <RouterContext.Provider value={{ asPath } as any}>
      <Probe />
    </RouterContext.Provider>
  );
}

const marked = (html: string) => /aria-current="page"/.test(html) && /data-active="true"/.test(html);
const hrefOf = (html: string) => html.match(/href="([^"]*)"/)?.[1];

// [label, href, currentPath, expected current?]
const CASES: [string, string, string, boolean][] = [
  ["home ref on /", "ref:page_home", "/", true],
  ["about ref on /", "ref:page_about", "/", false],
  ["about ref on /about", "ref:page_about", "/about", true],
  ["home ref on /about", "ref:page_home", "/about", false],
  ["path href, trailing slash + query", "/about", "/about/?x=1", true],
  ["preview route ref", "ref:page_about", "/view/site1/about", true],
  ["preview route home", "ref:page_home", "/view/site1", true],
  ["preview route non-current", "ref:page_home", "/view/site1/about", false],
  ["detail page item link", "ref:page_car/blue-van", "/car/blue-van", true],
  ["detail page sibling item", "ref:page_car/red-van", "/car/blue-van", false],
  ["in-page anchor is not the page", "#features", "/", false],
  ["external link", "https://example.com/", "/", false],
];

for (const [name, body, toHTML] of COMPONENTS) {
  for (const [label, href, path, expected] of CASES) {
    test(`${name}: ${label}`, () => {
      const s = staticHtml(toHTML, href, path);
      const r = reactHtml(body, href, path);
      assert.equal(hrefOf(s), hrefOf(r), `href differs\nstatic: ${s}\nreact:  ${r}`);
      assert.equal(marked(r), expected, `react: ${r}`);
      assert.equal(marked(s), expected, `static: ${s}`);
    });
  }

  test(`${name}: a nav with current + non-current items marks only the current one`, () => {
    for (const render of [
      (h: string) => staticHtml(toHTML, h, "/about"),
      (h: string) => reactHtml(body, h, "/about"),
    ]) {
      const nav = ["ref:page_home", "ref:page_about", "ref:page_car"].map(render);
      assert.deepEqual(nav.map(marked), [false, true, false], nav.join("\n"));
    }
  });
}
