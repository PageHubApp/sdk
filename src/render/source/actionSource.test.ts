/**
 * Golden assertions for the Button/Link action source emitters.
 * Run: `npx tsx --test packages/sdk/src/render/source/actionSource.test.ts`
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import type { StaticRenderContext } from "../static/types";
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
  assert.equal(src, '<button commandfor="mobile-nav" command="toggle-popover" type="button">Open menu</button>');
});

test("open-modal button → show-modal invoker", () => {
  const src = buttonSource({ text: "Book now", action: [{ type: "open-modal", anchor: "contact-modal" }] }, "", ctx);
  assert.equal(src, '<button commandfor="contact-modal" command="show-modal" type="button">Book now</button>');
});

test("add-to-cart button → data-cart native attrs", () => {
  const src = buttonSource(
    { text: "Add to cart", className: "btn", action: [{ type: "add-to-cart", quantity: 2 }] },
    "",
    ctx,
  );
  assert.equal(src, '<button class="btn" data-cart="add" data-cart-qty="2" type="button">Add to cart</button>');
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
      '<span class="w-4 h-4 fill-current flex items-center justify-center" aria-hidden="true">' +
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
});
