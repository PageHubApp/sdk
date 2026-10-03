/**
 * Static-publish runtime — pure vanilla JS that hydrates the HTML emitted by
 * `renderToHTML` WITHOUT React.
 *
 * Emitted as `<script>` tags. Two payloads:
 *   - `PH_CART_BRIDGE_SCRIPT`: a tiny BLOCKING <head> script that seeds the
 *     `cart:items-json` / `cart:count` / `cart:total` keys into
 *     `window.__PH_STATE__` from `localStorage` BEFORE any data-state-text
 *     pill renders an outdated zero.
 *   - `getStaticPublishRuntimeScript(opts)`: the main IIFE injected at the
 *     end of `<body>`. Concatenates Alpine.js + per-concern chunks from
 *     `runtime/chunks/`. Each chunk is plain JS in a TS string template.
 *
 * Chunk order matters for ONE reason only: the preamble (Alpine.prefix,
 * Alpine.store, STATE_ATTRS, mapAttributes, addRootSelector) MUST run before
 * any Alpine.directive() call. After that, function hoisting means cross-chunk
 * references resolve at call time, so chunk order below is by concern.
 *
 * See docs/sdk/alpine-runtime.md for the Alpine.store / directive model.
 */

import { ALPINE_INLINE_SOURCE } from "./alpine.inline";
import { LEAFLET_PUBLIC_PATH } from "./leafletPublicPath.generated";
import { STATE_CHUNK } from "./chunks/state";
import { getConditionsChunk } from "./chunks/conditions";
import { ITEMS_CHUNK } from "./chunks/items";
import { ACTIONS_CHUNK } from "./chunks/actions";
import { CART_CHUNK } from "./chunks/cart";
import { FORMS_CHUNK } from "./chunks/forms";
import { REPEATER_CHUNK } from "./chunks/repeater";
import { AUX_CHUNK } from "./chunks/aux";
import { BOOTSTRAP_CHUNK } from "./chunks/bootstrap";
import { SITE_CHAT_CHUNK } from "./chunks/siteChat";
import { STATE_PREFIX, STATE_KEY } from "../../../utils/state/keys";

export interface StaticPublishRuntimeOptions {
  /** Tailwind `md` breakpoint, used by condition `device: mobile` evaluation. */
  mobileBreakpoint?: number;
  /** Page id — used to namespace the cart in localStorage. */
  pageId?: string;
  /** Public connector-data endpoint path. */
  publicDataEndpoint?: string;
  /**
   * URL serving `getStaticPublishRuntimeSource()`. Set → the page carries only
   * its config inline and loads the runtime as one cacheable `defer` script.
   * Unset → the runtime is inlined (for hosts that can't serve the asset).
   */
  src?: string;
}

/**
 * Synchronous <head>-emitted cart bridge. Must run BEFORE any other handler
 * attaches so `data-state-text="cart:count"` pills don't paint "0" briefly.
 */
export function getCartBridgeScript(opts: { pageId?: string } = {}): string {
  const pageIdLit = JSON.stringify(opts.pageId || "");
  return `<script>
(function(){
  try {
    window.__PH_STATE__ = window.__PH_STATE__ || {};
    var pageId = ${pageIdLit} || (typeof localStorage !== 'undefined' && localStorage.getItem('ph-pageid')) || '';
    if (!pageId) return;
    var raw = null;
    try { raw = localStorage.getItem('ph-cart-' + pageId); } catch(e){}
    if (!raw) return;
    var arr = [];
    try { arr = JSON.parse(raw); } catch(e){}
    if (!Array.isArray(arr)) arr = [];
    var count = 0;
    var total = 0;
    for (var i=0; i<arr.length; i++) {
      var line = arr[i] || {};
      var qty = Number(line.quantity) || 0;
      count += qty;
      var amount = (line.item && line.item.price && Number(line.item.price.amount)) || Number(line.amount) || 0;
      total += amount * qty;
    }
    window.__PH_STATE__['${STATE_KEY.cartItemsJson}'] = { kind: 'value', value: JSON.stringify(arr) };
    window.__PH_STATE__['${STATE_KEY.cartCount}'] = { kind: 'value', value: String(count) };
    window.__PH_STATE__['${STATE_KEY.cartTotal}'] = { kind: 'value', value: String(total) };
  } catch (e) {}
})();
</script>`;
}

/**
 * The runtime's per-page tags: an inline config, then the runtime itself —
 * external (`opts.src`) or inlined. The runtime is ~28 KB gzipped and the same
 * on every page, so inlining it puts all of it inside every document's
 * critical download and none of it in the browser cache.
 */
export function getStaticPublishRuntimeScript(
  opts: StaticPublishRuntimeOptions = {}
): string {
  const cfg = JSON.stringify({
    pageId: opts.pageId || "",
    publicDataEndpoint: opts.publicDataEndpoint || "/api/connectors/public-data",
    mobileBreakpoint: opts.mobileBreakpoint ?? 768,
  }).replace(/</g, "\\u003c");
  const cfgScript = `<script>window.__PH_RT__=${cfg};</script>`;
  if (opts.src) {
    return `${cfgScript}<script defer src="${opts.src.replace(/"/g, "&quot;")}"></script>`;
  }
  return `${cfgScript}<script>${getStaticPublishRuntimeSource()}</script>`;
}

/**
 * The site-chat chunk as an optional runtime extension — emitted only on
 * pages with a chat composer (`agent-send`), so every other page's runtime
 * stays chat-free. Place it after the runtime tags: it queues itself on
 * `window.__PH_RT_EXT__` if the (deferred) runtime hasn't booted yet, or runs
 * at once if it has (see bootstrap.ts).
 */
export function getSiteChatScript(): string {
  return `<script>(window.__PH_RT_EXT__=window.__PH_RT_EXT__||[]).push(function(__phRT,Alpine,PAGE_ID){${SITE_CHAT_CHUNK}});</script>`;
}

let runtimeSource: string | null = null;

/**
 * Main runtime IIFE — identical for every page; per-page values come from
 * `window.__PH_RT__` (see `getStaticPublishRuntimeScript`). No React, no
 * module loader (Leaflet is loaded on demand for `data-ph-map` nodes).
 */
export function getStaticPublishRuntimeSource(): string {
  if (runtimeSource) return runtimeSource;

  // Preamble: Alpine boot, store, prefix, attribute-name mapping, root
  // selectors. Must precede every other chunk.
  const preamble = `
"use strict";
var __PH_RT_CFG = window.__PH_RT__ || {};
var PAGE_ID = __PH_RT_CFG.pageId || "";
var PUBLIC_DATA_ENDPOINT = __PH_RT_CFG.publicDataEndpoint || "/api/connectors/public-data";
var MOBILE = __PH_RT_CFG.mobileBreakpoint || 768;

// Reactive-state keys/prefixes, stamped from the canonical \`utils/state/keys\`
// module. Chunks (\`runtime/chunks/*\`) are stringified + minified in isolation
// so they can't import — they reference these PH_* globals (declared ambient in
// chunks/runtime-globals.d.ts) and the value lives in ONE place (keys.ts).
var PH_URL_PREFIX = ${JSON.stringify(STATE_PREFIX.url)};
var PH_CART_OPEN = ${JSON.stringify(STATE_KEY.cartOpen)};
var PH_CART_COUNT = ${JSON.stringify(STATE_KEY.cartCount)};
var PH_CART_TOTAL = ${JSON.stringify(STATE_KEY.cartTotal)};
var PH_CART_ITEMS_JSON = ${JSON.stringify(STATE_KEY.cartItemsJson)};
var PH_CART_ERROR = ${JSON.stringify(STATE_KEY.cartError)};
var PH_AUTH_STATUS = ${JSON.stringify(STATE_KEY.authStatus)};

// Leaflet is served from OUR origin, not a public CDN. A root-relative path
// resolves against whatever host serves the page, so CSP \`script-src 'self'\`
// already covers it — no allow-list entry, no configured base URL. The files
// are copied to public/_ph/leaflet/<version>/ by scripts/vendor-leaflet-public.mjs,
// which also writes the path constant imported above, so the served files and
// this string cannot drift apart.
// \`__PH_ASSET_BASE__\` is the escape hatch for a third-party consumer hosting
// renderToHTML() output somewhere that doesn't serve /_ph/*; unset means
// same-origin, which is what every PageHub-hosted site wants.
var PH_LEAFLET_BASE = (window.__PH_ASSET_BASE__ || '') + ${JSON.stringify(
    LEAFLET_PUBLIC_PATH
  )};

var Alpine = window.Alpine;
Alpine.prefix('data-ph-');
Alpine.store('ph', { entries: Object.create(null), revision: 0 });
var _store = Alpine.store('ph');
var _shownStack = [];
var _escInstalled = false;

// Cross-chunk function registry. Each chunk is authored as a separate
// stringifyChunk(function $name(){...}) call; when minified independently
// by SWC/esbuild, internal function declarations get renamed to single
// letters (e.g. setState → e). Cross-chunk calls (bootstrap chunk reaching
// state chunk's setState) break because identifiers don't match. The fix:
// definer chunks publish their cross-chunk-shared functions onto __phRT via
// STRING property names (which minifiers don't mangle). Caller chunks
// destructure from __phRT at the top of their body. Property-key strings
// survive any minifier renaming pass intact. __phRT itself is a shared
// runtime registry — namespaced so it doesn't collide with consumer globals.
var __phRT = {};

var STATE_ATTRS = [
  'data-state-text','data-state-template','data-state-show-when-truthy','data-state-style-bindings',
  'data-state-modifiers','data-state-binding','data-visibility-state-key',
  'data-publish-state-keys','data-computed-state-bindings','data-state-inputs',
  'data-state-scope'
];
var ROOT_ATTRS = STATE_ATTRS.concat(['data-ph-actions','data-ph-form','data-ph-cart-items']);
Alpine.mapAttributes(function(pair){
  if (STATE_ATTRS.indexOf(pair.name) !== -1) {
    return { name: 'data-ph-' + pair.name.slice('data-'.length), value: pair.value };
  }
  return pair;
});
for (var _ri=0; _ri<ROOT_ATTRS.length; _ri++) (function(a){
  Alpine.addRootSelector(function(){ return '[' + a + ']'; });
})(ROOT_ATTRS[_ri]);
`;

  runtimeSource = `
${ALPINE_INLINE_SOURCE}
;(function(){
${preamble}
${STATE_CHUNK}
${ITEMS_CHUNK}
${getConditionsChunk()}
${AUX_CHUNK}
${CART_CHUNK}
${ACTIONS_CHUNK}
${FORMS_CHUNK}
${REPEATER_CHUNK}
${BOOTSTRAP_CHUNK}
})();
`;
  return runtimeSource;
}
