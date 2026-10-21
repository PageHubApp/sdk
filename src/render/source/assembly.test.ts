import { test } from "node:test";
import assert from "node:assert/strict";
import { liftPartials, renderDocument } from "./assembly";
import type { StaticRenderContext } from "../static/types";

const ctx = { view: "desktop" } as unknown as StaticRenderContext;

test("header is lifted to a partial; its call site becomes {% render %}", () => {
  const nodes = {
    ROOT: { type: "Container", props: {}, nodes: ["hdr", "pg"] },
    hdr: { type: "Container", props: { type: "header", className: "flex" }, nodes: ["logo"] },
    logo: { type: "Text", props: { tagName: "span", text: "Acme" }, nodes: [] },
    pg: { type: "Container", props: { type: "page" }, nodes: ["h1"] },
    h1: { type: "Text", props: { tagName: "h1", text: "Home" }, nodes: [] },
  } as any;

  const { page, partials } = liftPartials("ROOT", nodes, ctx);

  assert.equal(partials.header, `<header class="flex"><span>Acme</span></header>`);
  assert.match(page, /\{% render 'header' %\}/);
  // The non-lifted page container is still emitted inline.
  assert.match(page, /<article><h1>Home<\/h1><\/article>/);
  // The header element itself does not appear inline in the page body.
  assert.doesNotMatch(page, /<header/);
});

test("footer and a reusable component both lift", () => {
  const nodes = {
    ROOT: { type: "Container", props: {}, nodes: ["cta", "ftr"] },
    cta: { type: "Container", props: { type: "component", component: "Pricing CTA" }, nodes: ["b"] },
    b: { type: "Text", props: { tagName: "p", text: "Buy" }, nodes: [] },
    ftr: { type: "Container", props: { type: "footer", className: "w-full" }, nodes: [] },
  } as any;

  const { page, partials } = liftPartials("ROOT", nodes, ctx);

  // Component wrapper is editor-only — its partial is its children, not a wrapping element.
  assert.equal(partials["pricing-cta"], `<p>Buy</p>`);
  assert.equal(partials.footer, `<footer class="w-full"></footer>`);
  assert.match(page, /\{% render 'pricing-cta' %\}/);
  assert.match(page, /\{% render 'footer' %\}/);
});

test("renderDocument wraps the body in a shell with <head><title>", () => {
  const nodes = {
    ROOT: {
      type: "Container",
      props: { seo: { title: "Plants for slow rooms", description: "Low-light houseplants." } },
      nodes: ["pg"],
    },
    pg: { type: "Container", props: { type: "page" }, nodes: [] },
  } as any;

  const doc = renderDocument("ROOT", nodes, ctx);

  assert.match(doc, /^<!DOCTYPE html>/);
  assert.match(doc, /<head>/);
  assert.match(doc, /<title>Plants for slow rooms<\/title>/);
  assert.match(doc, /<meta name="description" content="Low-light houseplants." \/>/);
  assert.match(doc, /<body>[\s\S]*<article><\/article>[\s\S]*<\/body>/);
});
