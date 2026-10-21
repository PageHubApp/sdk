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

test("visibilityStateKey → data-state-show (only when runtime-parseable)", () => {
  const ok = { ROOT: { type: "Container", props: { type: "div", visibilityStateKey: "faq-open" }, nodes: [] } } as any;
  assert.equal(renderToSource("ROOT", ok, ctx), `<div data-state-show="faq-open"></div>`);

  // colon-namespaced cart/form keys can't be parsed by the runtime's test() → dropped
  const cart = { ROOT: { type: "Container", props: { type: "div", visibilityStateKey: "cart:open" }, nodes: [] } } as any;
  assert.equal(renderToSource("ROOT", cart, ctx), `<div></div>`);
});

test("inViewState → data-state-in-view=key=value", () => {
  const nodes = {
    ROOT: { type: "Container", props: { type: "section", inViewState: { key: "deck:step", value: "intro" } }, nodes: [] },
  } as any;
  assert.equal(renderToSource("ROOT", nodes, ctx), `<section data-state-in-view="deck:step=intro"></section>`);
});

test("root.animation (entrance) → data-animate + override vars; load trigger stamped", () => {
  const scroll = {
    ROOT: { type: "Container", props: { type: "div", root: { animation: "cssFadeUp", animationDuration: "0.8", animationEasing: "spring" } }, nodes: [] },
  } as any;
  assert.equal(
    renderToSource("ROOT", scroll, ctx),
    `<div style="animation-duration: 0.8s; animation-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.275); --anim-duration: 0.8s; --anim-easing: cubic-bezier(0.175, 0.885, 0.32, 1.275)" data-animate="fade-up"></div>`,
  );

  // A load-trigger preset stamps data-animate-trigger="load".
  const load = { ROOT: { type: "Container", props: { type: "div", root: { animation: "cssTileFlip" } }, nodes: [] } } as any;
  assert.equal(renderToSource("ROOT", load, ctx), `<div data-animate="tile-flip" data-animate-trigger="load"></div>`);

  // Continuous / hover presets and site animations have no runtime mechanism → no data-animate.
  const spin = { ROOT: { type: "Container", props: { type: "div", root: { animation: "cssSpin" } }, nodes: [] } } as any;
  assert.equal(renderToSource("ROOT", spin, ctx), `<div></div>`);
});

test("Container stateModifiers → data-state-class (componentName from node)", () => {
  const nodes = {
    ROOT: {
      type: "Container",
      props: {
        type: "div",
        className: "hidden",
        stateModifiers: [
          { conditions: [{ logic: "all", conditions: [{ type: "state", key: "panel", operator: "equals", value: "one" }] }], modifiers: ["shown-flex"] },
        ],
      },
      nodes: [],
    },
  } as any;
  assert.equal(renderToSource("ROOT", nodes, ctx), `<div class="hidden" data-state-class="panel=one:flex"></div>`);
});
