import test from "node:test";
import assert from "node:assert/strict";
import { formSource, formElementSource } from "./formSource";
import type { StaticRenderContext } from "../../utils/staticHtml";

// formElementSource reads only `renderingNodeId` / `currentItem` off ctx; the
// rest of StaticRenderContext is irrelevant to the source emitter.
const ctx = {} as StaticRenderContext;

test("collection form → {% form '<slug>', map, notify %}", () => {
  const out = formSource(
    {
      submissionType: "collection",
      collectionSlug: "leads",
      collectionFieldMap: { phone: "mobile" },
      collectionSkipEmail: true,
      className: "contact-form",
      id: "lead-form",
    },
    "<CHILDREN>",
    ctx
  );
  assert.equal(
    out,
    `{% form 'leads', map: 'phone=mobile', notify: false, class: "contact-form", id: "lead-form" %}<CHILDREN>{% endform %}`
  );
});

test("collection form → fixed: carries collectionFieldValues as JSON", () => {
  const out = formSource(
    { submissionType: "collection", collectionSlug: "leads", collectionFieldValues: { public: false, source: "it's \"web\"\\x" } },
    "<C>",
    ctx
  );
  const m = /fixed: '([^']*)'/.exec(out);
  assert.ok(m, out);
  assert.doesNotMatch(m![1]!, /\\["\\']/);
  assert.deepEqual(JSON.parse(m![1]!), { public: false, source: "it's \"web\"\\x" });
});

test("collection form without fixed values emits no fixed:", () => {
  assert.doesNotMatch(formSource({ submissionType: "collection", collectionSlug: "leads", collectionFieldValues: {} }, "", ctx), /fixed/);
});

test("webhook form → to / webhook / redirect args, inbox name slugified", () => {
  const out = formSource(
    {
      submissionType: "webhook",
      formName: "Contact Us",
      webhookUrl: "https://hooks.example.com/x",
      successUrl: "/thanks",
      mailto: "me@x.com",
    },
    "<CHILDREN>",
    ctx
  );
  assert.equal(
    out,
    `{% form 'contact-us', to: 'me@x.com', webhook: 'https://hooks.example.com/x', redirect: '/thanks' %}<CHILDREN>{% endform %}`
  );
});

test("custom-action form stays a native <form action method>", () => {
  const out = formSource(
    { submissionType: "custom", action: "https://example.com/hook", method: "POST", className: "search" },
    "<CHILDREN>",
    ctx
  );
  assert.equal(
    out,
    `<form class="search" action="https://example.com/hook" method="POST"><CHILDREN></form>`
  );
});

test("text input → real <input> with type / name / placeholder / required", () => {
  const out = formElementSource(
    { type: "text", name: "email", placeholder: "you@example.com", required: true, className: "input input-bordered" },
    "",
    ctx
  );
  assert.equal(
    out,
    `<input class="input input-bordered" type="text" name="email" placeholder="you@example.com" required autocomplete="email" aria-label="email">`
  );
});

test("select → <select> with <option> list from props.options", () => {
  const out = formElementSource(
    {
      type: "select",
      name: "size",
      className: "select",
      defaultValue: "m",
      options: [
        { label: "Small", value: "s" },
        { label: "Medium", value: "m" },
        { label: "Large", value: "l", disabled: true },
      ],
    },
    "",
    ctx
  );
  assert.equal(
    out,
    `<select class="select" name="size" aria-label="size">` +
      `<option value="s">Small</option>` +
      `<option value="m" selected>Medium</option>` +
      `<option value="l" disabled>Large</option>` +
      `</select>`
  );
});

test("textarea → <textarea rows> with escaped default content", () => {
  const out = formElementSource(
    { type: "textarea", name: "message", rows: 5, defaultValue: "a & b" },
    "",
    ctx
  );
  assert.equal(
    out,
    `<textarea name="message" aria-label="message" rows="5">a &amp; b</textarea>`
  );
});

test("stateBinding → data-state-bind (+ checked mode, debounce); a url: key may hold a row token", () => {
  assert.equal(
    formElementSource({ type: "search", name: "q", stateBinding: { key: "url:q", debounceMs: 300 } }, "", ctx),
    `<input type="search" name="q" aria-label="q" data-state-bind="url:q" data-debounce="300ms">`
  );
  assert.equal(
    formElementSource({ type: "checkbox", name: "f", stateBinding: { key: "url:facet.{{item.facetKey}}", mode: "checked" } }, "", ctx),
    `<input type="checkbox" name="f" aria-label="f" data-state-bind="url:facet.{{item.facetKey}}" data-bind-mode="checked">`
  );
});
