import { test } from "node:test";
import assert from "node:assert/strict";
import { blockToSource } from "./block";

test("a structure becomes one snippet; modifier tokens expand to their classes", () => {
  const { source } = blockToSource(
    {
      type: "Container",
      props: { className: "w-full card-surface", custom: { displayName: "Card" } },
      children: [
        { type: "Text", props: { tagName: "h2", text: "Hello", className: "body-text" } },
        { type: "Text", props: { tagName: "p", text: "{{company.name}}" } },
      ],
    },
    { Container: [{ name: "card-surface", classes: "bg-base-200 rounded-box" }], Text: [{ name: "body-text", classes: "text-sm" }] },
  );
  assert.match(source, /^<div class="w-full bg-base-200 rounded-box">/);
  assert.match(source, /<h2 class="text-sm">Hello<\/h2>/);
  assert.doesNotMatch(source, /card-surface|body-text|custom/);
});

test("a collection form keeps its fixed values and the repeater becomes a for loop", () => {
  const { source } = blockToSource({
    type: "Container",
    children: [
      {
        type: "Form",
        props: { submissionType: "collection", collectionSlug: "leads", collectionFieldValues: { public: false } },
        children: [{ type: "FormElement", props: { type: "email", name: "email" } }],
      },
      {
        type: "Data",
        props: { dataSource: { provider: "collection", collection: "services" } },
        children: [{ type: "Text", props: { tagName: "p", text: "<p>{{item.title}}</p>" } }],
      },
    ],
  });
  assert.match(source, /\{% form 'leads', fixed: '\{"public":false\}' %\}/);
  assert.match(source, /\{% for item in collections\.services/);
});

test("a show-hide target becomes a popover, an open-modal target a dialog", () => {
  const { source } = blockToSource({
    type: "Container",
    children: [
      { type: "Button", props: { text: "Menu", action: [{ type: "show-hide", target: "menu", method: "class" }] } },
      { type: "Container", props: { className: "hidden", attrs: { id: "menu" } } },
      { type: "Button", props: { text: "Ask", action: [{ type: "open-modal", anchor: "ask" }] } },
      { type: "Container", props: { attrs: { id: "ask" } } },
    ],
  });
  assert.match(source, /popover="manual"/);
  assert.match(source, /<dialog/);
});

test("a node with no type is an error, not a silent drop", () => {
  assert.throws(() => blockToSource({ type: "Container", children: [{} as any] }), /no "type"/);
});
