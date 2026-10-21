import { test } from "node:test";
import assert from "node:assert/strict";
import {
  videoSource,
  audioSource,
  embedSource,
  mapSource,
  mapPointSource,
  mapPathSource,
} from "./mediaSource";
import type { StaticRenderContext } from "../static/types";

const ctx = { view: "desktop" } as unknown as StaticRenderContext;

test("Video: R2 media id → native <video> with the file_url filter", () => {
  const out = videoSource(
    { provider: "r2", videoId: "vid_1", className: "rounded-xl w-full" },
    "",
    ctx
  );
  assert.equal(
    out,
    `<div role="region" aria-label="Video: vid_1">` +
      `<video src="{{ &quot;vid_1&quot; | file_url }}" class="rounded-xl w-full" title="r2 video vid_1" playsinline controls preload="metadata"></video>` +
      `</div>`
  );
});

test("Video: a provider id → the embed iframe", () => {
  const out = videoSource({ provider: "youtube", videoId: "dQw4", title: "Promo" }, "", ctx);
  assert.equal(
    out,
    `<div role="region" aria-label="Promo">` +
      `<iframe src="https://www.youtube.com/embed/dQw4" frameborder="0" ` +
      `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ` +
      `allowfullscreen title="Promo" loading="lazy"></iframe>` +
      `</div>`
  );
});

test("Audio: media id → native <audio> through file_url", () => {
  const out = audioSource({ src: "aud_9", className: "w-full" }, "", ctx);
  assert.equal(
    out,
    `<div role="region" aria-label="Audio: aud_9">` +
      `<audio src="{{ &quot;aud_9&quot; | file_url }}" class="w-full" controls preload="metadata" style="width: 100%">` +
      `Your browser does not support the audio element.</audio>` +
      `</div>`
  );
});

test("Embed: a service URL → the generated iframe, kept inline", () => {
  const out = embedSource(
    {
      service: "google-calendar",
      url: "https://calendar.google.com/calendar/embed?src=abc",
      title: "Book a call",
      className: "my-embed",
    },
    "",
    ctx
  );
  assert.equal(
    out,
    `<div class="my-embed" role="region" aria-label="Book a call">` +
      `<iframe src="https://calendar.google.com/calendar/embed?src=abc" style="border:0" width="100%" height="600" frameborder="0" scrolling="no"></iframe>` +
      `</div>`
  );
});

test("Map with a MapPoint child → container data-attrs + a hidden point carrier", () => {
  const point = mapPointSource({ lat: "40.1", lng: "-74.2", title: "Shop" }, "", ctx);
  assert.equal(
    point,
    `<div data-ph-map-point data-lat="40.1" data-lng="-74.2" data-title="Shop" hidden></div>`
  );

  const out = mapSource(
    { className: "h-96 w-full", tileStyle: "osm", grayscale: true, lat: "40.1", lng: "-74.2", zoom: "15" },
    point,
    ctx
  );
  assert.equal(
    out,
    `<div class="overflow-hidden h-96 w-full" role="region" aria-label="Map" data-ph-map ` +
      `data-lat="40.1" data-lng="-74.2" data-zoom="15" data-type="interactive" data-tile-style="osm" data-grayscale="true">` +
      `<div data-ph-map-point data-lat="40.1" data-lng="-74.2" data-title="Shop" hidden></div>` +
      `</div>`
  );
});

test("MapPath: a route line → a hidden data-* carrier (path kept verbatim)", () => {
  const out = mapPathSource(
    { path: "40.1,-74.2\n40.3,-74.4", color: "#f00", weight: 5, label: "Route" },
    "",
    ctx
  );
  assert.equal(
    out,
    `<div data-ph-map-path data-path="40.1,-74.2\n40.3,-74.4" data-color="#f00" data-weight="5" data-dashed="true" data-label="Route" hidden></div>`
  );
});

test("Map centers on {{ item.* }} bindings verbatim on a detail page", () => {
  const out = mapSource({ lat: "{{ item.lat }}", lng: "{{ item.lng }}" }, "", ctx);
  assert.match(out, /data-lat="\{\{ item\.lat \}\}" data-lng="\{\{ item\.lng \}\}"/);
});
