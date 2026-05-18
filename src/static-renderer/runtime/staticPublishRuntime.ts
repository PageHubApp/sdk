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
import { STATE_CHUNK } from "./chunks/state";
import { getConditionsChunk } from "./chunks/conditions";
import { ITEMS_CHUNK } from "./chunks/items";
import { ACTIONS_CHUNK } from "./chunks/actions";
import { CART_CHUNK } from "./chunks/cart";
import { FORMS_CHUNK } from "./chunks/forms";
import { REPEATER_CHUNK } from "./chunks/repeater";
import { AUX_CHUNK } from "./chunks/aux";
import { BOOTSTRAP_CHUNK } from "./chunks/bootstrap";

export interface StaticPublishRuntimeOptions {
  /** Tailwind `md` breakpoint, used by condition `device: mobile` evaluation. */
  mobileBreakpoint?: number;
  /** Page id — used to namespace the cart in localStorage. */
  pageId?: string;
  /** Public connector-data endpoint path. */
  publicDataEndpoint?: string;
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
    window.__PH_STATE__['cart:items-json'] = { kind: 'value', value: JSON.stringify(arr) };
    window.__PH_STATE__['cart:count'] = { kind: 'value', value: String(count) };
    window.__PH_STATE__['cart:total'] = { kind: 'value', value: String(total) };
  } catch (e) {}
})();
</script>`;
}

/**
 * Main runtime IIFE. Bundled as one string so static export ships a single
 * <script> tag. No React, no module loader (Leaflet is dynamically imported
 * from a CDN for `data-ph-map` nodes).
 */
export function getStaticPublishRuntimeScript(
  opts: StaticPublishRuntimeOptions = {}
): string {
  const mobileBreakpoint = opts.mobileBreakpoint ?? 768;
  const pageIdLit = JSON.stringify(opts.pageId || "");
  const endpointLit = JSON.stringify(opts.publicDataEndpoint || "/api/connectors/public-data");

  // Preamble: Alpine boot, store, prefix, attribute-name mapping, root
  // selectors. Must precede every other chunk.
  const preamble = `
"use strict";
var PAGE_ID = ${pageIdLit};
var PUBLIC_DATA_ENDPOINT = ${endpointLit};
var MOBILE = ${mobileBreakpoint};

var Alpine = window.Alpine;
Alpine.prefix('data-ph-');
Alpine.store('ph', { entries: Object.create(null), revision: 0 });
var _store = Alpine.store('ph');
var _shownStack = [];
var _escInstalled = false;

var STATE_ATTRS = [
  'data-state-text','data-state-show-when-truthy','data-state-style-bindings',
  'data-state-modifiers','data-state-binding','data-visibility-state-key',
  'data-publish-state-keys','data-computed-state-bindings','data-state-inputs'
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

  return `<script>
${ALPINE_INLINE_SOURCE}
;(function(){
${preamble}
${STATE_CHUNK}
${ITEMS_CHUNK}
${getConditionsChunk(mobileBreakpoint)}
${AUX_CHUNK}
${CART_CHUNK}
${ACTIONS_CHUNK}
${FORMS_CHUNK}
${REPEATER_CHUNK}
${BOOTSTRAP_CHUNK}
})();
</script>`;
}
