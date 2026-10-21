import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToSource } from "./toSource";
import type { StaticRenderContext } from "../static/types";

const ctx = { view: "desktop" } as unknown as StaticRenderContext;

test("Container → element with same tag/class/id; children recursed", () => {
  const nodes = {
    ROOT: { type: "Container", props: { type: "section", className: "flex p-4", id: "hero" }, nodes: ["t1"] },
    t1: { type: "Text", props: { tagName: "h1", className: "text-3xl", text: "Plants for slow rooms" }, nodes: [] },
  } as any;
  const out = renderToSource("ROOT", nodes, ctx);
  assert.equal(out, `<section class="flex p-4" id="hero"><h1 class="text-3xl">Plants for slow rooms</h1></section>`);
});

test("Text keeps {{ }} binding tokens verbatim (not interpolated)", () => {
  const nodes = {
    ROOT: { type: "Text", props: { tagName: "p", text: "Hi {{ company.name }}" }, nodes: [] },
  } as any;
  assert.equal(renderToSource("ROOT", nodes, ctx), `<p>Hi {{ company.name }}</p>`);
});

test("Image: inline SVG kept as a labelled span; media id → image_url filter", () => {
  const svg = { ROOT: { type: "Image", props: { type: "svg", content: "<svg><path/></svg>", alt: "Leaf" }, nodes: [] } } as any;
  assert.equal(renderToSource("ROOT", svg, ctx), `<span aria-label="Leaf"><svg><path/></svg></span>`);

  const media = { ROOT: { type: "Image", props: { content: "abc123", alt: "Fern" }, nodes: [] } } as any;
  assert.equal(renderToSource("ROOT", media, ctx), `<img src="{{ 'abc123' | image_url }}" alt="Fern">`);

  const url = { ROOT: { type: "Image", props: { content: "https://x/y.png", alt: "" }, nodes: [] } } as any;
  assert.equal(renderToSource("ROOT", url, ctx), `<img src="https://x/y.png">`);
});

test("a node condition wraps the element in {% if %}", () => {
  const nodes = {
    ROOT: { type: "Container", props: { type: "div", conditionGroups: [{ conditions: [{ type: "auth", operator: "logged-in" }] }] }, nodes: [] },
  } as any;
  assert.equal(renderToSource("ROOT", nodes, ctx), `{% if customer %}<div></div>{% endif %}`);
});

test("reusable-component node contributes no inline markup (lifted to a partial)", () => {
  const nodes = { ROOT: { type: "Container", props: { type: "component" }, nodes: [] } } as any;
  assert.equal(renderToSource("ROOT", nodes, ctx), "");
});
