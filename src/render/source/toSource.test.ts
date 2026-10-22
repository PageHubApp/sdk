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

test("a runtime state conditionGroups → data-state-show on the element (not {% if %}, not reported)", () => {
  const nodes = {
    ROOT: {
      type: "Container",
      props: {
        type: "div",
        className: "card",
        conditionGroups: [
          {
            logic: "any",
            conditions: [
              { type: "state", key: "store:filter", operator: "not-exists", value: "" },
              { type: "state", key: "store:filter", operator: "equals", value: "all" },
              { type: "state", key: "store:filter", operator: "equals", value: "people" },
            ],
          },
        ],
      },
      nodes: [],
    },
  } as any;
  assert.equal(
    renderToSource("ROOT", nodes, ctx),
    `<div data-state-show="!store:filter||store:filter=all||store:filter=people" class="card"></div>`,
  );
});

test("reusable-component node contributes no inline markup (lifted to a partial)", () => {
  const nodes = { ROOT: { type: "Container", props: { type: "component" }, nodes: [] } } as any;
  assert.equal(renderToSource("ROOT", nodes, ctx), "");
});

test("visibilityStateKey → data-state-show (only when runtime-parseable)", () => {
  const ok = { ROOT: { type: "Container", props: { type: "div", visibilityStateKey: "faq-open" }, nodes: [] } } as any;
  assert.equal(renderToSource("ROOT", ok, ctx), `<div data-state-show="faq-open"></div>`);

  // form slot keys are the form chunk's, not a state show → dropped
  const form = { ROOT: { type: "Container", props: { type: "div", visibilityStateKey: "form:x:extra" }, nodes: [] } } as any;
  assert.equal(renderToSource("ROOT", form, ctx), `<div></div>`);
});

test("cart:open drawer panel → data-state-show, hidden attribute, flex restored for a column", () => {
  const panel = { ROOT: { type: "Container", props: { type: "div", visibilityStateKey: "cart:open", className: "fixed flex-col hidden h-full" }, nodes: [] } } as any;
  assert.equal(renderToSource("ROOT", panel, ctx), `<div class="fixed flex-col h-full flex" hidden="hidden" data-state-show="cart:open"></div>`);
});

test("CartItems → the host the cart chunk fills, every setting stamped as a data attribute", () => {
  const nodes = { ROOT: { type: "CartItems", props: { className: "px-6", emptyText: "Nothing yet" }, nodes: [] } } as any;
  const src = renderToSource("ROOT", nodes, ctx);
  assert.match(src, /^<div class="px-6" data-cart-items="true" data-empty-class="[^"]+" data-empty-text="Nothing yet"/);
  assert.ok(src.includes('data-remove-button-class="btn btn-ghost btn-xs btn-circle text-error ml-auto"'));
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

test("Text drops the TipTap <p> wrapper so it sits in its own element", () => {
  const nodes = { ROOT: { type: "Text", props: { tagName: "span", text: "<p>Hi</p>" }, nodes: [] } } as any;
  assert.equal(renderToSource("ROOT", nodes, ctx), `<span>Hi</span>`);
  const multi = { ROOT: { type: "Text", props: { tagName: "div", text: "<p>a</p><p>b</p>" }, nodes: [] } } as any;
  assert.equal(renderToSource("ROOT", multi, ctx), `<div>a<br/><br/>b</div>`);
});

test("Text marks rich-text item fields | raw via ctx.richFields", () => {
  const rctx = { view: "desktop", richFields: new Set(["richBody"]) } as unknown as StaticRenderContext;
  const nodes = { ROOT: { type: "Text", props: { tagName: "div", text: "<p>{{item.richBody}}</p>" }, nodes: [] } } as any;
  assert.equal(renderToSource("ROOT", nodes, rctx), `<div>{{ item.richBody | replace: '</p><p>', '<br/><br/>' | raw }}</div>`);
});

test("a Form's linkedNodes slots render, mapped to data-form-state with the hidden attribute", () => {
  const nodes = {
    ROOT: {
      type: "Form",
      props: { submissionType: "email", formName: "Quote" },
      nodes: ["f1"],
      linkedNodes: { formFieldsContainer: "fc", loadingTextContainer: "lc", sentTextContainer: "sc" },
    },
    f1: { type: "Text", props: { tagName: "p", text: "field" }, nodes: [] },
    fc: { type: "Container", props: { className: "contents", visibilityStateKey: "form:ROOT:fields" }, nodes: [] },
    lc: { type: "Container", props: { className: "hidden flex", visibilityStateKey: "form:ROOT:loading" }, nodes: ["t1"] },
    t1: { type: "Text", props: { tagName: "p", text: "Sending…" }, nodes: [] },
    sc: { type: "Container", props: { className: "hidden flex", visibilityStateKey: "form:ROOT:loaded" }, nodes: ["t2"] },
    t2: { type: "Text", props: { tagName: "p", text: "Thank you!" }, nodes: [] },
  } as any;
  const out = renderToSource("ROOT", nodes, ctx);
  assert.match(out, /<p>field<\/p><div class="contents" data-form-state="idle"><\/div>/);
  assert.match(out, /<div class="flex" data-form-state="sending" hidden="hidden"><p>Sending…<\/p><\/div>/);
  assert.match(out, /<div class="flex" data-form-state="sent" hidden="hidden"><p>Thank you!<\/p><\/div>/);
});

test("CartSubtotal emits the built-in Subtotal row, hidden until the cart has items", () => {
  const nodes = { ROOT: { type: "CartSubtotal", props: { className: "border-t px-6" }, nodes: [] } } as any;
  assert.equal(
    renderToSource("ROOT", nodes, ctx),
    `<div class="border-t px-6" hidden="hidden" data-state-show="cart:count>0"><div class="flex items-center justify-between"><span class="text-base-content/70">Subtotal</span><span class="text-xl font-bold" data-state-text="cart:total"></span></div></div>`
  );
});

test("Text binds a blanked state token to data-state-text (JSON paths included)", () => {
  const nodes = { ROOT: { type: "Text", props: { tagName: "p", text: '<p><span data-variable="state.pdp:current:matching-variant.formatted" class="variable-node">{{state.pdp:current:matching-variant.formatted}}</span></p>' }, nodes: [] } } as any;
  assert.equal(
    renderToSource("ROOT", nodes, ctx),
    `<p><span data-variable="state.pdp:current:matching-variant.formatted" class="variable-node" data-state-text="pdp:current:matching-variant.formatted"></span></p>`
  );
});

test("Container variant-match computedStateBindings → data-state-compute", () => {
  const nodes = {
    ROOT: {
      type: "Container",
      props: {
        type: "div",
        computedStateBindings: [
          { key: "pdp:current:matching-variant", compute: { type: "variant-match", variantMap: "{{item.variantMapJson}}", axes: "{{item.optionNamesCsv}}", axisKeyTemplate: "pdp:current:axis:%axis%" } },
        ],
      },
      nodes: [],
    },
  } as any;
  assert.equal(
    renderToSource("ROOT", nodes, ctx),
    `<div data-state-compute="variant-match" data-compute-key="pdp:current:matching-variant" data-variants="{{item.variantMapJson}}" data-axes="{{item.optionNamesCsv}}" data-axis-key="pdp:current:axis:%axis%"></div>`
  );
});
