/**
 * Golden assertions for the Button/Link action source emitters.
 * Run: `npx tsx --test packages/sdk/src/render/source/actionSource.test.ts`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { StaticRenderContext } from "../../utils/staticHtml";
import { buttonSource, linkSource, actionToAttrs } from "./actionSource";

const ctx = {} as StaticRenderContext;

test("link button → native <a href> (single action, no chain attr)", () => {
  const src = buttonSource(
    {
      text: "Shop now",
      className: "btn btn-primary",
      action: [{ type: "link", href: "https://example.com", target: "_blank" }],
    },
    "",
    ctx,
  );
  assert.equal(
    src,
    '<a class="btn btn-primary" href="https://example.com" target="_blank" rel="noopener noreferrer">Shop now</a>',
  );
  assert.ok(!src.includes("data-ph-actions"));
});

test("show-hide button → commandfor + command invoker on <button>", () => {
  const src = buttonSource(
    { text: "Open menu", action: [{ type: "show-hide", target: "mobile-nav", direction: "toggle" }] },
    "",
    ctx,
  );
  // A bare <button> (no btn/cursor-* class) gets cursor-pointer, same as Button.toHTML.
  assert.equal(
    src,
    '<button class="cursor-pointer" commandfor="mobile-nav" command="toggle-popover" type="button">Open menu</button>',
  );
});

test("open-modal button → show-modal invoker", () => {
  const src = buttonSource({ text: "Book now", action: [{ type: "open-modal", anchor: "contact-modal" }] }, "", ctx);
  assert.equal(
    src,
    '<button class="cursor-pointer" commandfor="contact-modal" command="show-modal" type="button">Book now</button>',
  );
});

test("add-to-cart button → data-cart native attrs", () => {
  const src = buttonSource(
    { text: "Add to cart", className: "btn", action: [{ type: "add-to-cart", quantity: 2 }] },
    "",
    ctx,
  );
  assert.match(src, /^<button class="btn" data-cart="add" data-cart-item="/);
  assert.match(src, /data-cart-qty="2" type="button">Add to cart<\/button>$/);
  // The row's cart fields ride as Liquid-bound JSON (`json` writes valid literals for any title).
  assert.ok(src.includes("&quot;title&quot;:{{ item.title | default: '' | json }}"));
  assert.ok(src.includes("&quot;priceId&quot;:{{ item.metadata.priceId | default: '' | json }}"));
  assert.ok(src.includes("&quot;amount&quot;:{{ item.price.amount | default: 0 }}"));
});

test("add-to-cart: quantity field + the variant axis template from the computed binding", () => {
  const nodes = { A: { props: { computedStateBindings: [{ key: "pdp:v", compute: { type: "variant-match", axisKeyTemplate: "pdp:axis:%axis%" } }] } } };
  const attrs = actionToAttrs({ type: "add-to-cart", quantityField: "quantity", variantMatchStateKey: "pdp:v" } as any, { ...ctx, nodes } as any);
  assert.equal(attrs["data-cart-qty-field"], "quantity");
  assert.equal(attrs["data-cart-variant-axes"], "pdp:axis:%axis%");
  assert.equal(actionToAttrs({ type: "add-to-cart", variantMatchStateKey: "pdp:v" } as any)["data-cart-variant-axes"], undefined);
});

test("add-to-cart: a standalone product ships its fields literally", () => {
  const attrs = actionToAttrs({ type: "add-to-cart", priceId: "price_1", title: "Mug", price: 900 } as any);
  assert.deepEqual(JSON.parse(attrs["data-cart-item"]!), { id: "price_1", title: "Mug", price: { amount: 900, formatted: "", currency: "usd" }, metadata: { priceId: "price_1" } });
});

test("link with trailing icon → Liquid icon filter, text before span", () => {
  const src = linkSource(
    {
      text: "Learn more",
      icon: { value: "ref-icon:tb/TbArrowRight", position: "right" },
      action: [{ type: "link", href: "/about" }],
    },
    "",
    ctx,
  );
  assert.equal(
    src,
    '<a class="inline-flex flex-row items-center gap-1.5" href="/about">Learn more' +
      '<span class="w-4 h-4 fill-current flex items-center justify-center [&>svg]:w-full [&>svg]:h-full" aria-hidden="true">' +
      '{{ "tb/TbArrowRight" | icon }}</span></a>',
  );
});

test("multi-action chain → stacked native attrs + full data-ph-actions chain", () => {
  const src = buttonSource(
    {
      text: "Copy & go",
      action: [
        { type: "copy-to-clipboard", text: "SAVE10" },
        { type: "link", href: "https://example.com" },
      ],
    },
    "",
    ctx,
  );
  // First link still resolves to <a href>, the non-link action keeps its native attr,
  // and the ordered chain also ships as data-ph-actions.
  assert.ok(src.startsWith('<a href="https://example.com" rel="noopener noreferrer" data-copy="SAVE10"'));
  assert.ok(src.includes("data-ph-actions="));
  assert.ok(src.includes("copy-to-clipboard"));
  assert.ok(src.endsWith(">Copy &amp; go</a>") === false); // text is verbatim, not escaped
  assert.ok(src.endsWith(">Copy & go</a>"));
});

test("show-hide direction:tab → data-tab-target + data-tab-of (no native command)", () => {
  const src = buttonSource(
    { text: "Slide 1", action: [{ type: "show-hide", target: "slide-1", direction: "tab", group: "gallery" }] },
    "",
    ctx,
  );
  assert.equal(src, '<button class="cursor-pointer" data-tab-target="slide-1" data-tab-of="gallery" type="button">Slide 1</button>');
  assert.ok(!src.includes("commandfor"));
});

test("show-hide trigger:load → data-show-* with the localStorage gate as a test() expression", () => {
  const a = {
    type: "show-hide", target: "cookie", direction: "show", trigger: "load",
    conditions: [{ logic: "all", conditions: [{ type: "localStorage", key: "ph-cookie", operator: "not-exists", value: "" }] }],
  } as any;
  assert.deepEqual(actionToAttrs(a), { "data-show-on": "load", "data-show-target": "cookie", "data-show-dir": "show", "data-show-if": "!ls:ph-cookie" });
});

test("show-hide trigger:hover → data-show-on=hover, no commandfor", () => {
  const out = actionToAttrs({ type: "show-hide", target: "menu", direction: "show", trigger: "hover" } as any);
  assert.deepEqual(out, { "data-show-on": "hover", "data-show-target": "menu", "data-show-dir": "show" });
});

test("set/remove-local-storage → raw ls: state keys; several sets join with ;", () => {
  assert.deepEqual(actionToAttrs({ type: "set-local-storage", key: "k", value: "1" } as any), { "data-state-set": "ls:k:1" });
  assert.deepEqual(actionToAttrs({ type: "remove-local-storage", key: "k" } as any), { "data-state-clear": "ls:k" });
  const src = buttonSource({ text: "x", action: [{ type: "set-local-storage", key: "a", value: "1" }, { type: "set-local-storage", key: "b", value: "2" }] }, "", ctx);
  assert.ok(src.includes('data-state-set="ls:a:1;ls:b:2"'));
});

test("Button stateModifiers (tab-active) → data-state-class resolved from Button registry", () => {
  const bctx = { renderingNodeId: "b1", nodes: { b1: { type: "Button" }, ROOT: { props: {} } } } as any;
  const src = buttonSource(
    {
      text: "Pricing",
      className: "btn",
      action: [{ type: "set-state", key: "tabs-group", value: "tab-panel-1" }],
      stateModifiers: [
        { conditions: [{ logic: "all", conditions: [{ type: "state", key: "tabs-group", operator: "equals", value: "tab-panel-1" }] }], modifiers: ["tab-active"] },
      ],
    },
    "",
    bctx,
  );
  assert.ok(src.includes('data-state-set="tabs-group:tab-panel-1"'));
  assert.ok(src.includes('data-state-class="tabs-group=tab-panel-1=>border-primary text-primary"'));
});

test("actionToAttrs: state actions use ':' separator (splitKey), trigger + bounds", () => {
  assert.deepEqual(actionToAttrs({ type: "set-state", key: "tab", value: "pricing" }), { "data-state-set": "tab:pricing" });
  assert.deepEqual(actionToAttrs({ type: "toggle-state", key: "menu" }), { "data-state-toggle": "menu" });
  assert.deepEqual(actionToAttrs({ type: "toggle-state", key: "mode", values: ["on", "off"] }), {
    "data-state-toggle": "mode:on|off",
  });
  assert.deepEqual(actionToAttrs({ type: "clear-state", key: "tab" }), { "data-state-clear": "tab" });
  assert.deepEqual(
    actionToAttrs({ type: "increment-state", key: "slide", step: 1, min: 0, max: 3, wrap: true, trigger: "interval", intervalMs: 5000 }),
    { "data-state-step": "slide:+1", "data-state-on": "interval", "data-every": "5000ms", "data-min": "0", "data-max": "3", "data-wrap": "" },
  );
  assert.deepEqual(actionToAttrs({ type: "decrement-state", key: "slide" }), { "data-state-step": "slide:-1" });
  assert.deepEqual(actionToAttrs({ type: "toggle-theme" }), { "data-theme-toggle": "" });
  assert.deepEqual(actionToAttrs({ type: "toggle-cart" }), { "data-cart": "open" });
  assert.deepEqual(actionToAttrs({ type: "cart-checkout" }), { "data-cart": "checkout" });
  assert.deepEqual(actionToAttrs({ type: "cart-checkout", successHref: "/thanks", cancelHref: "/shop" }, ctx as any), {
    "data-cart": "checkout",
    "data-cart-success": "/thanks",
    "data-cart-cancel": "/shop",
  });
});
