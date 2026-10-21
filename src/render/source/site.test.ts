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
  assert.match(home, /^{% render 'header' %}/); // chrome renders inline, in ROOT order
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
