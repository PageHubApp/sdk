import { test } from "node:test";
import assert from "node:assert/strict";
import { convertSite } from "./site";
import { collectComponents } from "./componentSource";

const ctx = () => ({ view: "desktop" }) as any;
const T = (resolvedName: string) => ({ resolvedName });

/** ROOT = header (with an instance) + a master + two pages (one instance each, one inside a repeater). */
const SITE: any = {
  ROOT: { type: T("Container"), props: {}, nodes: ["hdr", "cmp", "home", "shop"], parent: null },
  hdr: { type: T("Container"), props: { type: "header" }, nodes: ["hdrInst"], parent: "ROOT" },
  hdrInst: { type: T("Container"), props: { className: "promo", relation: { belongsTo: "cmpBody", relationType: "full" } }, nodes: ["hdrInstT"], parent: "hdr" },
  hdrInstT: { type: T("Text"), props: { tagName: "p", text: "Free shipping", relation: { belongsTo: "cmpT" } }, nodes: [], parent: "hdrInst" },
  cmp: { type: T("Container"), props: { type: "component" }, custom: { displayName: "Promo Bar" }, nodes: ["cmpBody"], parent: "ROOT" },
  cmpBody: { type: T("Container"), props: { className: "promo" }, nodes: ["cmpT"], parent: "cmp" },
  cmpT: { type: T("Text"), props: { tagName: "p", text: "Free shipping" }, nodes: [], parent: "cmpBody" },
  home: { type: T("Container"), props: { type: "page", isHomePage: true }, nodes: ["homeInst"], parent: "ROOT" },
  homeInst: { type: T("Container"), props: { className: "promo", relation: { belongsTo: "cmpBody" } }, nodes: [], parent: "home" },
  shop: { type: T("Container"), props: { type: "page", pageSlug: "shop" }, nodes: ["styled"], parent: "ROOT" },
  styled: { type: T("Container"), props: { className: "promo bg-primary", relation: { belongsTo: "cmpBody", relationType: "style" } }, nodes: ["styledT"], parent: "shop" },
  styledT: { type: T("Text"), props: { tagName: "p", text: "Free shipping" }, nodes: [], parent: "styled" },
};

test("a component master becomes its own partial, named from its display name, and is on no page", () => {
  const b = convertSite("ROOT", SITE, ctx());
  assert.equal(b.files["partials/promo-bar.liquid"], `<div class="promo"><p>Free shipping</p></div>`);
  // The master is not chrome: only the page's own instance renders it (the style-linked copy on /shop doesn't).
  assert.equal((b.files["index.liquid"].match(/render 'promo-bar'/g) || []).length, 1);
  assert.equal((b.files["shop.liquid"].match(/render 'promo-bar'/g) || []).length, 0);
});

test("a linked instance renders the partial, on a page and inside the header", () => {
  const b = convertSite("ROOT", SITE, ctx());
  assert.match(b.files["index.liquid"], /{% render 'promo-bar' %}/);
  assert.match(b.files["partials/header.liquid"], /{% render 'promo-bar' %}/);
  assert.doesNotMatch(b.files["partials/header.liquid"], /Free shipping/);
});

test("a style-linked instance keeps its own markup", () => {
  const b = convertSite("ROOT", SITE, ctx());
  assert.match(b.files["shop.liquid"], /class="promo bg-primary"/);
  assert.doesNotMatch(b.files["shop.liquid"], /render 'promo-bar'/);
});

test("an instance passes the loop variables its partial reads", () => {
  const nodes: any = {
    ROOT: { type: T("Container"), props: {}, nodes: ["cmp", "home"], parent: null },
    cmp: { type: T("Container"), props: { type: "component" }, custom: { displayName: "Card" }, nodes: ["body"], parent: "ROOT" },
    body: { type: T("Text"), props: { tagName: "h3", text: "{{item.title}}" }, nodes: [], parent: "cmp" },
    home: { type: T("Container"), props: { type: "page", isHomePage: true }, nodes: ["inst"], parent: "ROOT" },
    inst: { type: T("Text"), props: { tagName: "h3", text: "{{item.title}}", relation: { belongsTo: "body" } }, nodes: [], parent: "home" },
  };
  const b = convertSite("ROOT", nodes, ctx());
  assert.match(b.files["index.liquid"], /{% render 'card', item: item %}/);
});

test("component slugs never take a converter partial's name or each other's", () => {
  const nodes: any = {
    ROOT: { nodes: ["a", "b", "c"] },
    a: { props: { type: "component" }, custom: { displayName: "Header" }, nodes: ["a1"] },
    b: { props: { type: "component" }, custom: { displayName: "Card" }, nodes: ["b1"] },
    c: { props: { type: "component" }, custom: { displayName: "card" }, nodes: ["c1"] },
  };
  assert.deepEqual(collectComponents("ROOT", nodes).map((c) => c.slug), ["header-2", "card", "card-2"]);
});
