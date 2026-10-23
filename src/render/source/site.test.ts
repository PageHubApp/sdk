import { test } from "node:test";
import assert from "node:assert/strict";
import { convertSite } from "./site";

const ctx = { view: "desktop" } as any;

/** ROOT = header + two pages (home + shop/:handle) + footer. */
const MULTI: any = {
  ROOT: {
    type: { resolvedName: "Container" },
    props: { company: { name: "Moss & Fern" }, seo: { lang: "en" } },
    nodes: ["hdr", "home", "shop", "ftr"],
    parent: null,
  },
  hdr: { type: { resolvedName: "Container" }, props: { type: "header", className: "nav" }, nodes: ["logo"], parent: "ROOT" },
  logo: { type: { resolvedName: "Text" }, props: { tagName: "span", text: "MF" }, nodes: [], parent: "hdr" },
  home: {
    type: { resolvedName: "Container" },
    props: { type: "page", isHomePage: true, pageSlug: "home", title: "Plants for slow rooms", seo: { description: "Calm plants." } },
    nodes: ["h1"],
    parent: "ROOT",
  },
  h1: { type: { resolvedName: "Text" }, props: { tagName: "h1", className: "text-3xl", text: "Plants for slow rooms" }, nodes: [], parent: "home" },
  shop: {
    type: { resolvedName: "Container" },
    props: { type: "page", pageSlug: "shop", pathPattern: ":handle", title: "Shop" },
    nodes: ["sh"],
    parent: "ROOT",
  },
  sh: { type: { resolvedName: "Text" }, props: { tagName: "h1", text: "Shop" }, nodes: [], parent: "shop" },
  ftr: { type: { resolvedName: "Container" }, props: { type: "footer", className: "foot" }, nodes: [], parent: "ROOT" },
};

test("splits each page into its own file at its route path", () => {
  const b = convertSite("ROOT", MULTI, ctx);
  assert.ok(b.files["index.liquid"], "home → index.liquid");
  assert.ok(b.files["shop/[handle].liquid"], "dynamic page → [handle] file segment");
  const urls = b.pages.map((p) => p.url).sort();
  assert.deepEqual(urls, ["/", "/shop/:handle"]);
});

test("two pages that claim one file each keep a file of their own; only the first is home", () => {
  const nodes: any = {
    ROOT: { type: { resolvedName: "Container" }, props: {}, nodes: ["a", "b", "c"], parent: null },
    a: { type: { resolvedName: "Container" }, props: { type: "page", isHomePage: true }, nodes: [], parent: "ROOT", custom: { displayName: "Home Page" } },
    b: { type: { resolvedName: "Container" }, props: { type: "page", isHomePage: true }, nodes: [], parent: "ROOT", custom: { displayName: "Landing" } },
    c: { type: { resolvedName: "Container" }, props: { type: "page", pageSlug: "landing" }, nodes: [], parent: "ROOT" },
  };
  const b = convertSite("ROOT", nodes, ctx);
  assert.equal(new Set(b.pages.map((p) => p.path)).size, 3, "every page has its own file");
  assert.deepEqual(b.pages.map((p) => p.policy.isHome === true), [true, false, false]);
  assert.equal(b.pages[0]!.path, "index.liquid");
  assert.equal(b.pages[1]!.url, "/landing");
  assert.equal(b.pages[2]!.path, "landing-c.liquid");
});

test("lifts header/footer into partials, referenced from every page", () => {
  const b = convertSite("ROOT", MULTI, ctx);
  assert.ok(b.files["partials/header.liquid"].includes("MF"));
  assert.equal(b.files["partials/footer.liquid"] !== undefined, true);
  for (const path of ["index.liquid", "shop/[handle].liquid"]) {
    assert.match(b.files[path], /{% render 'header' %}/);
    assert.match(b.files[path], /{% render 'footer' %}/);
  }
});

test("each page is a body fragment (no document shell — host wraps it)", () => {
  const b = convertSite("ROOT", MULTI, ctx);
  const home = b.files["index.liquid"];
  assert.doesNotMatch(home, /<!DOCTYPE|<html|<head>|<body>/);
  assert.match(home, /^<main\b[^>]*>/); // page sequence is wrapped in the live root wrapper
  assert.match(home, /<\/main>$/);
  // chrome renders inline inside <main>, in ROOT order: header, page, footer
  assert.match(home, /^<main\b[^>]*>\s*{% render 'header' %}[\s\S]*<h1[^>]*>[\s\S]*{% render 'footer' %}\s*<\/main>$/);
  assert.match(home, /<h1[^>]*>Plants for slow rooms<\/h1>/);
  assert.match(home, /{% render 'footer' %}/);
  assert.equal(b.files["partials/head.liquid"], undefined); // SEO lives on the page record, not a head file
  assert.equal(b.site.lang, "en");
});

test("SEO lands on the host record meta, not in the file", () => {
  const b = convertSite("ROOT", MULTI, ctx);
  const home = b.pages.find((p) => p.url === "/")!;
  assert.equal(home.title, "Plants for slow rooms");
  assert.equal(home.meta.description, "Calm plants.");
  assert.equal(home.policy.isHome, true);
});

test("site record carries pages + default routes", () => {
  const b = convertSite("ROOT", MULTI, ctx);
  assert.equal(b.site.name, "Moss & Fern");
  assert.equal(b.site.pages.length, 2);
  assert.equal(b.site.routes["index"], "/");
  assert.equal(b.site.routes["shop/[handle]"], "/shop/:handle");
});

test("single-page site (no page nodes) becomes index.liquid from ROOT body", () => {
  const SINGLE: any = {
    ROOT: { type: { resolvedName: "Container" }, props: { title: "One Pager", seo: { description: "d" } }, nodes: ["hero"], parent: null },
    hero: { type: { resolvedName: "Container" }, props: { type: "section" }, nodes: ["t"], parent: "ROOT" },
    t: { type: { resolvedName: "Text" }, props: { tagName: "h1", text: "Hi" }, nodes: [], parent: "hero" },
  };
  const b = convertSite("ROOT", SINGLE, ctx);
  assert.equal(b.pages.length, 1);
  assert.equal(b.pages[0].url, "/");
  assert.equal(b.pages[0].path, "index.liquid");
  assert.match(b.files["index.liquid"], /<section><h1>Hi<\/h1><\/section>/);
});

test("a page's hideChrome / hideHeader / hideFooter drop the matching chrome partials", () => {
  const nodes: any = JSON.parse(JSON.stringify(MULTI));
  nodes.home.props.hideChrome = true;
  nodes.shop.props.hideFooter = true;
  const b = convertSite("ROOT", nodes, ctx);
  assert.doesNotMatch(b.files["index.liquid"], /{% render 'header' %}|{% render 'footer' %}/);
  assert.match(b.files["shop/[handle].liquid"], /{% render 'header' %}/);
  assert.doesNotMatch(b.files["shop/[handle].liquid"], /{% render 'footer' %}/);
});

test("convertSite only requests utility font weights the family supports", () => {
  const nodes: any = {
    ROOT: {
      type: { resolvedName: "Container" },
      props: { theme: { typography: [{ name: "Heading", fontFamily: "Alpha", fontWeight: "700" }, { name: "Body", fontFamily: "Beta", fontWeight: "400" }] } },
      nodes: ["t"],
      parent: null,
    },
    t: { type: { resolvedName: "Text" }, props: { tagName: "p", className: "font-semibold font-light", text: "x" }, nodes: [], parent: "ROOT" },
  };
  const fonts = (fontWeights?: any) => convertSite("ROOT", nodes, { ...ctx, fontWeights }).fonts;
  assert.match(fonts({ Beta: ["300", "400", "700"] }), /family=Beta:wght@300;400(&|$)/);
  assert.doesNotMatch(fonts({ Beta: ["300", "400", "700"] }), /600/);
  assert.doesNotMatch(fonts(), /300|600/);
});

test("a handler no runtime attribute covers is registered in a `handlers` partial every page renders; a site without one gets none", () => {
  const plain = convertSite("ROOT", MULTI, ctx);
  assert.ok(!plain.files["partials/handlers.liquid"]);
  assert.ok(!plain.files["index.liquid"].includes("HANDLERS"));
  const nodes: any = JSON.parse(JSON.stringify(MULTI));
  nodes.h1.type = { resolvedName: "Container" };
  nodes.h1.props = { className: "x", handlers: { onClick: "try{window.gtag('consent','update',{ad_storage:'denied'})}catch(e){}" } };
  const b = convertSite("ROOT", nodes, ctx);
  assert.match(b.files["partials/handlers.liquid"]!, /^\{% raw %\}<script>/);
  assert.match(b.files["index.liquid"]!, /\{% render 'handlers' %\}/);
  assert.match(b.files["shop/[handle].liquid"]!, /\{% render 'handlers' %\}/);
  assert.match(b.files["index.liquid"]!, /data-on="click:ph_h_/);
  assert.ok(!/ onclick=/.test(b.files["index.liquid"]!));
  assert.equal(b.pages.find((p) => p.path === "index.liquid")!.source, b.files["index.liquid"]);
});
