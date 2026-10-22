import { test } from "node:test";
import assert from "node:assert/strict";
import { dataSource } from "./dataSource";
import type { StaticRenderContext } from "../static/types";

/**
 * Build a ctx the way the walker sets one up around a `Data` node: `nodes` is
 * the tree (children re-emit through the real `sourceResolver`), and
 * `repeaterChildIds` are the Data node's children to split into template rows
 * vs the empty slot. The emitter is called directly (the walker wiring lives in
 * toSource.ts, which this file doesn't touch).
 */
function ctxFor(nodes: Record<string, any>, childIds: string[]): StaticRenderContext {
  return { view: "desktop", nodes, repeaterChildIds: childIds } as unknown as StaticRenderContext;
}

test("connector-backed repeater → {% for item in products %}", () => {
  const nodes = {
    t1: { type: "Text", props: { tagName: "h3", className: "title", text: "{{item.title}}" }, nodes: [] },
  };
  const out = dataSource(
    { className: "grid gap-4", dataSource: { provider: "stripe", collection: "products" } },
    "",
    ctxFor(nodes, ["t1"])
  );
  assert.equal(
    out,
    `<div class="grid gap-4">{% for item in products %}<h3 class="title">{{item.title}}</h3>{% endfor %}</div>`
  );
});

test("global names: CMS collections → collections.<slug>, Stripe catalog → products / product_categories", () => {
  const nodes = { t1: { type: "Text", props: { tagName: "h3", text: "{{item.title}}" }, nodes: [] } };
  const loop = (provider: string, collection: string) =>
    dataSource({ dataSource: { provider, collection } }, "", ctxFor(nodes, ["t1"]));
  assert.match(loop("collection", "services"), /\{% for item in collections\.services %\}/);
  assert.match(loop("stripe", "products.categories"), /\{% for item in product_categories %\}/);
  assert.match(loop("stripe", "product"), /\{% for item in product %\}/);
  assert.match(loop("customer", "orders"), /\{% for item in customer\.orders %\}/);
});

test("scope repeater iterates into the parent item → {% for item in item.<path> %}", () => {
  const nodes = {
    img: { type: "Text", props: { tagName: "span", className: "chip", text: "{{item.value}}" }, nodes: [] },
  };
  const out = dataSource(
    { type: "ul", className: "flex", dataSource: { scope: "item.images" } },
    "",
    ctxFor(nodes, ["img"])
  );
  assert.equal(
    out,
    `<ul class="flex">{% assign rows_img = item.images | data_items %}{% for item in rows_img %}<span class="chip">{{item.value}}</span>{% endfor %}</ul>`
  );
});

test("scope + splitBy comma-string → data_items assigned before the loop", () => {
  const nodes = {
    sz: { type: "Text", props: { tagName: "span", className: "size", text: "{{item.value}}" }, nodes: [] },
  };
  const out = dataSource(
    { dataSource: { scope: "item.metadata.sizes", splitBy: "," } },
    "",
    ctxFor(nodes, ["sz"])
  );
  assert.equal(
    out,
    `<div>{% assign rows_sz = item.metadata.sizes | data_items: ',' %}{% for item in rows_sz %}<span class="size">{{item.value}}</span>{% endfor %}</div>`
  );
});

test("empty slot (custom.dataRole:'empty') becomes the {% else %} branch", () => {
  const nodes = {
    row: { type: "Text", props: { tagName: "h3", className: "t", text: "{{item.title}}" }, nodes: [] },
    none: {
      type: "Text",
      props: { tagName: "p", className: "empty", text: "No products yet" },
      nodes: [],
      custom: { dataRole: "empty" },
    },
  };
  const out = dataSource(
    { dataSource: { provider: "stripe", collection: "products" } },
    "",
    ctxFor(nodes, ["row", "none"])
  );
  assert.equal(
    out,
    `<div>{% for item in products %}<h3 class="t">{{item.title}}</h3>{% else %}<p class="empty">No products yet</p>{% endfor %}</div>`
  );
});

test("no dataSource → plain Container-style pass-through (no loop)", () => {
  const out = dataSource(
    { type: "section", className: "wrap" },
    `<p>static child</p>`,
    { view: "desktop" } as unknown as StaticRenderContext
  );
  assert.equal(out, `<section class="wrap"><p>static child</p></section>`);
});

test("a facets feed with facetKeys filters the PRODUCTS, then folds them with the facets filter", () => {
  const nodes = { t: { type: "Text", props: { tagName: "span", text: "{{item.title}}" }, nodes: [] } };
  const out = dataSource(
    { dataSource: { provider: "stripe", collection: "products.facets", facetKeys: "colors,fit", filter: { categories: "apparel" } } },
    "",
    ctxFor(nodes, ["t"])
  );
  assert.match(out, /\{% assign rows_t = products \| where: 'categories', 'apparel' \| facets: 'colors,fit' %\}\{% for item in rows_t %\}/);
});
