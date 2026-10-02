import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderImageBody, type ImageProps } from "./Image.body";
import { toHTML } from "./Image.toHTML";
import { makeWalkerCtx } from "../../render/react/RenderCtx";
import type { NodeAction } from "../../utils/action";

const SRC = "https://example.com/photo.jpg";
const conversion = {
  provider: "google-ads" as const,
  eventName: "conversion",
  sendTo: "AW-1/IMG",
};

/** Live (walker) render: returns the markup plus the root React element. */
function renderLive(props: ImageProps) {
  const ctx = makeWalkerCtx({
    id: "img1",
    isCanvas: false,
    hasChildNodes: false,
    displayName: "Image",
    rootProps: {},
    pageMedia: null,
    pageIndex: {},
  });
  let el: React.ReactElement<any> | null = null;
  const Probe = () => {
    el = renderImageBody(props, ctx) as React.ReactElement<any>;
    return el;
  };
  const html = renderToStaticMarkup(<Probe />);
  return { html, el: el as unknown as React.ReactElement<any> };
}

/** The <img> element inside an optional `<a>` wrapper. */
const imgOf = (el: React.ReactElement<any>) =>
  el.type === "a" ? (el.props.children as React.ReactElement<any>) : el;

const staticHtml = (props: Record<string, unknown>) =>
  toHTML({ type: "url", ...props }, "", { nodes: {}, classes: new Set() } as any) as string;

test("no action, no url → bare <img>, no wrapper", () => {
  const { html, el } = renderLive({ type: "url", src: SRC, className: "w-full" });
  assert.match(html, /^<img /);
  assert.equal(el.props.onClick, undefined);
});

test("tel link + conversion, no url → <a href> around an <img> carrying the dispatcher", () => {
  const action: NodeAction[] = [{ type: "link", href: "tel:+15551234567", conversion }];
  const { html, el } = renderLive({ type: "url", src: SRC, alt: "Call us", action });
  assert.match(html, /^<a href="tel:\+15551234567" aria-label="Call us"><img /);
  assert.equal(el.type, "a");
  const img = imgOf(el);
  assert.equal(typeof img.props.onClick, "function");
  assert.equal(img.props["data-action"], "link");
});

test("plain link, no url → <a href>, native navigation (no JS handler)", () => {
  const { html, el } = renderLive({
    type: "url",
    src: SRC,
    action: [{ type: "link", href: "/about" }],
  });
  assert.match(html, /^<a href="\/about"/);
  assert.equal(imgOf(el).props.onClick, undefined);
});

test("non-link action, no url → bare <img> carrying the handler", () => {
  const { html, el } = renderLive({
    type: "url",
    src: SRC,
    action: [{ type: "copy-to-clipboard", text: "x" } as NodeAction],
  });
  assert.match(html, /^<img /);
  assert.equal(typeof el.props.onClick, "function");
});

test("legacy url keeps the classed <a> wrapper", () => {
  const { html } = renderLive({ type: "url", src: SRC, url: "/legacy", className: "w-full" });
  assert.match(html, /^<a [^>]*href="\/legacy"[^>]*class="w-full"/);
});

test("React and static walkers agree on structure for action images", () => {
  const link = { action: [{ type: "link", href: "tel:+15551234567", conversion }], src: SRC };
  assert.match(staticHtml(link), /^<a href="tel:\+15551234567"[^>]*><img /);
  assert.match(renderLive({ type: "url", ...link } as ImageProps).html, /^<a href="tel:/);

  const copy = { action: [{ type: "copy-to-clipboard", text: "x" }], src: SRC };
  assert.match(staticHtml(copy), /^<img /);
  assert.match(renderLive({ type: "url", ...copy } as ImageProps).html, /^<img /);
});
