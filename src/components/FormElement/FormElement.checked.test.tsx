/**
 * `defaultChecked` ticks a checkbox / radio on first paint, on both walkers.
 * Run: pnpm test:form-element
 */
import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderFormElementBody } from "./FormElement.body";
import { toHTML } from "./FormElement.toHTML";
import { makeWalkerCtx } from "../../render/react/RenderCtx";

function renderLive(props: any): string {
  const ctx = makeWalkerCtx({
    id: "f1",
    isCanvas: false,
    hasChildNodes: false,
    displayName: "Field",
    rootProps: {},
    pageMedia: null,
    pageIndex: {},
  });
  const Probe = () => renderFormElementBody(props, ctx) as React.ReactElement;
  return renderToStaticMarkup(<Probe />);
}

const staticCtx = (): any => ({ classes: new Set<string>(), nodes: { ROOT: { props: {} } } });

const ticked = { type: "checkbox", name: "terms", defaultChecked: true, attrs: { value: "yes" } };

test("React walker renders a defaultChecked checkbox ticked", () => {
  assert.match(renderLive(ticked), /checked=""/);
  assert.doesNotMatch(renderLive({ ...ticked, defaultChecked: false }), /checked/);
});

test("static walker renders a defaultChecked radio ticked", () => {
  const html = toHTML({ ...ticked, type: "radio" }, "", staticCtx());
  assert.match(html, /\schecked(\s|>|\/)/);
  assert.match(html, /value="yes"/);
  assert.doesNotMatch(toHTML({ ...ticked, defaultChecked: false }, "", staticCtx()), /\schecked/);
});

test("defaultChecked is ignored on non-tick fields", () => {
  assert.doesNotMatch(toHTML({ type: "text", defaultChecked: true }, "", staticCtx()), /\schecked/);
  assert.doesNotMatch(renderLive({ type: "text", defaultChecked: true }), /checked/);
});

test("a bound checked-mode box seeds its state with the submitted value (static)", () => {
  const html = toHTML(
    { ...ticked, stateBinding: { key: "url:terms", mode: "checked" } },
    "",
    staticCtx()
  );
  const m = html.match(/data-state-binding="([^"]+)"/);
  assert.ok(m, html);
  const b = JSON.parse(m![1].replace(/&quot;/g, '"'));
  assert.equal(b.defaultValue, "yes");
});
