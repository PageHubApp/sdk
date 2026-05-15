/**
 * Static-publish runtime — pure vanilla JS that hydrates the HTML emitted by
 * `renderToHTML` WITHOUT React.
 *
 * Emitted as `<script>` tags by `renderToHTML` when `runtime: true` is set.
 * Two payloads:
 *   - `PH_CART_BRIDGE_SCRIPT`: a tiny BLOCKING <head> script that seeds the
 *     `cart:items-json` / `cart:count` / `cart:total` keys into
 *     `window.__PH_STATE__` from `localStorage` BEFORE any data-state-text
 *     pill renders an outdated zero.
 *   - `getStaticPublishRuntimeScript(opts)`: the main IIFE injected at the
 *     end of `<body>`. Initializes state registry, URL bridge, walks the DOM
 *     for every data-* binding attribute, attaches action handlers, hydrates
 *     cart / customer / forms / map.
 *
 * ─── Consumed data attributes ─────────────────────────────────────────
 *   data-ph-actions               click/hover action chain (NodeAction[])
 *   data-state-binding            form input ↔ state two-way binding
 *   data-state-modifiers          reactive className composition
 *   data-state-style-bindings     reactive inline-style writes
 *   data-computed-state-bindings  computed-state effects (stubbed — Wave 5)
 *   data-visibility-state-key     show/hide via cart:open-style keys
 *   data-publish-state-keys       (consumed by repeater client refetch)
 *   data-state-text               text-node subscription (cart count, dynamic copy)
 *   data-state-show-when-truthy   toggle `hidden` based on a state key
 *   data-connector-id+            connector refetch (with data-state-inputs)
 *   data-binding-key              binding ID for refetch
 *   data-state-inputs             { fetchOpt: stateKey } for refetch
 *   data-item-id                  per-iteration id (for reconciler)
 *   data-ph-map                   Leaflet mount payload
 *
 * ─── State keys this runtime writes ───────────────────────────────────
 *   url:<param>                   URL bridge
 *   auth:status                   customer-token detection result
 *   customer:*                    customer-token /api/customer/me payload
 *   cart:items-json               cart line items (JSON-encoded)
 *   cart:count                    item count integer (string)
 *   cart:total                    cart subtotal cents (string)
 *   cart:open                     drawer visibility
 *   cart:error                    "select a variant" etc.
 *   connector:<provider>:<key>    publishStateKeys per refetch
 *
 * ─── localStorage keys used ───────────────────────────────────────────
 *   ph-cart-<pageId>              JSON-encoded cart line items
 *   ph-pageid                     last seen page id (compat with cart bridge)
 *
 * ─── Init order ──────────────────────────────────────────────────────
 *   1. Cart bridge (synchronous head script)
 *   2. State registry init + URL bridge mount
 *   3. Bindings walk (state-text, visibility, style, modifiers, binding)
 *   4. Action dispatcher attach
 *   5. Form submit attach
 *   6. Repeater connector refetch watch
 *   7. Customer token detect (async)
 *   8. Analytics stubs
 *   9. Map mount (async, Leaflet CDN)
 */

import { buildConditionEvalFns } from "../../utils/conditions/clientScript";
import { ALPINE_INLINE_SOURCE } from "./alpine.inline";

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
 * Seeds `window.__PH_STATE__` (the shape the load-action script already uses)
 * with the parsed cart from localStorage.
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
 * <script> tag. No React, no module loader, no external dependencies (except
 * Leaflet which is dynamically imported from a CDN for `data-ph-map` nodes).
 */
export function getStaticPublishRuntimeScript(
  opts: StaticPublishRuntimeOptions = {}
): string {
  const mobileBreakpoint = opts.mobileBreakpoint ?? 768;
  const pageIdLit = JSON.stringify(opts.pageId || "");
  const endpointLit = JSON.stringify(opts.publicDataEndpoint || "/api/connectors/public-data");

  return `<script>
${ALPINE_INLINE_SOURCE}
;(function(){
"use strict";
var PAGE_ID = ${pageIdLit};
var PUBLIC_DATA_ENDPOINT = ${endpointLit};
var MOBILE = ${mobileBreakpoint};

// ─── State registry — Alpine.store('ph') is the single source of truth ─
// Alpine wraps the store value in a reactive Proxy on creation, so any
// Alpine.effect that reads store.entries[k] reruns automatically when that
// entry mutates. Subscribers (legacy DOM-walk attach loops, future
// directives) go through subscribe() below, which is implemented on top of
// Alpine.effect.
var Alpine = window.Alpine;
// data-ph-* attributes resolve as Alpine directives via the prefix swap
// (e.g. data-ph-actions matches the 'actions' directive). data-state-*,
// data-visibility-*, data-publish-*, data-computed-* sit outside the prefix
// and are aliased per-attribute via Alpine.mapAttributes by the agent that
// owns those directives.
Alpine.prefix('data-ph-');
Alpine.store('ph', { entries: Object.create(null), revision: 0 });
var _store = Alpine.store('ph');
var _shownStack = [];
var _escInstalled = false;

function installEsc(){
  if (_escInstalled) return; _escInstalled = true;
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Escape' || !_shownStack.length) return;
    for (var i=_shownStack.length-1; i>=0; i--) {
      var top = _shownStack[i];
      var entry = _store.entries[top];
      if (!entry) { _shownStack.splice(i, 1); continue; }
      if (entry.source === 'computed') continue;
      var el = document.getElementById(top);
      if (el && el.getAttribute('data-close-on-escape') === 'false') continue;
      if (el) el.classList.add('hidden');
      setVisibility(top, 'hidden', 'esc');
      return;
    }
  });
}
function getState(key){ return _store.entries[key]; }
function getStateValue(key){ var e = _store.entries[key]; return e ? e.value : undefined; }
// Alpine schedules effects via queueMicrotask by default. Our existing tests
// + author-side custom JS handlers expect setState to fire dependent updates
// synchronously (matching the old notify() semantics). disableEffectScheduling
// flips Alpine's scheduler flag so the trigger fires inline.
function setState(key, patch, writer){
  if (!key) return;
  Alpine.disableEffectScheduling(function(){
    var prev = _store.entries[key];
    var next = {
      key: key,
      kind: patch.kind != null ? patch.kind : (prev ? prev.kind : 'value'),
      value: patch.value !== undefined ? patch.value : (prev ? prev.value : null),
      source: patch.source != null ? patch.source : (prev ? prev.source : 'runtime'),
      lastWriter: writer != null ? writer : (patch.lastWriter != null ? patch.lastWriter : (prev ? prev.lastWriter : undefined))
    };
    // Mirror into window.__PH_STATE__ so the inline condition evaluator (which
    // reads from there) sees reactive updates. evalCond uses { kind, value }
    // entries, matching the load-action seed shape.
    if (!window.__PH_STATE__) window.__PH_STATE__ = {};
    window.__PH_STATE__[key] = { kind: next.kind, value: next.value };
    if (prev && prev.value === next.value && prev.kind === next.kind && prev.source === next.source) {
      // Identity-preserving update — only lastWriter may differ. Mutate in
      // place so we don't trip the Proxy 'set' trap and re-fire effects.
      prev.lastWriter = next.lastWriter;
      return;
    }
    _store.entries[key] = next;
    _store.revision++;
    if (next.kind === 'visibility') {
      var idx = _shownStack.indexOf(key);
      if (next.value === 'shown') {
        if (idx !== -1) _shownStack.splice(idx, 1);
        _shownStack.push(key);
        installEsc();
      } else if (idx !== -1) {
        _shownStack.splice(idx, 1);
      }
    }
  });
}
function deleteState(key){
  if (!(key in _store.entries)) return;
  Alpine.disableEffectScheduling(function(){
    delete _store.entries[key];
    _store.revision++;
    if (window.__PH_STATE__) delete window.__PH_STATE__[key];
    var idx = _shownStack.indexOf(key);
    if (idx !== -1) _shownStack.splice(idx, 1);
  });
}
function setVisibility(key, value, writer){
  setState(key, { kind: 'visibility', value: value, source: 'runtime' }, writer);
}
function listStates(){
  var out = []; for (var k in _store.entries) out.push(_store.entries[k]); return out;
}
// subscribe — keyed: rerun fn whenever entries[key] mutates; global: rerun
// whenever store.revision bumps (which setState does on every distinct write).
// Effects fire synchronously on first call, matching the existing "update();
// subscribe(key, update);" idiom (the explicit pre-call becomes redundant but
// harmless because update bodies are idempotent).
function subscribe(keyOrFn, fn){
  var runner;
  if (typeof keyOrFn === 'function') {
    runner = Alpine.effect(function(){ void _store.revision; keyOrFn(); });
  } else {
    runner = Alpine.effect(function(){ void _store.entries[keyOrFn]; fn(); });
  }
  return function(){ try { Alpine.release(runner); } catch(e){} };
}

// ─── __PH_STATE__ seed (cart bridge / load-action script populated it) ─
function seedFromWindow(){
  var seed = window.__PH_STATE__;
  if (!seed) return;
  for (var key in seed) {
    if (!key) continue;
    var raw = seed[key];
    setState(key, { kind: (raw && raw.kind) || 'value', value: raw ? raw.value : null, source: 'load' }, 'seed');
  }
}

// ─── URL ↔ state bridge ────────────────────────────────────────────────
var URL_PREFIX = 'url:';
function syncUrlToState(source){
  var params = new URLSearchParams(window.location.search);
  var seen = {};
  params.forEach(function(v, k){
    seen[k] = true;
    setState(URL_PREFIX + k, { kind: 'value', value: v, source: source }, 'url-bridge');
  });
  var all = listStates();
  for (var i=0; i<all.length; i++) {
    var entry = all[i];
    if (entry.key.indexOf(URL_PREFIX) !== 0) continue;
    var param = entry.key.slice(URL_PREFIX.length);
    if (!seen[param] && entry.value) {
      setState(entry.key, { kind: 'value', value: '', source: source }, 'url-bridge');
    }
  }
}
function syncStateToUrl(){
  var next = new URLSearchParams();
  var all = listStates();
  for (var i=0; i<all.length; i++) {
    var entry = all[i];
    if (entry.key.indexOf(URL_PREFIX) !== 0) continue;
    var param = entry.key.slice(URL_PREFIX.length);
    if (typeof entry.value === 'string' && entry.value.length > 0) next.set(param, entry.value);
  }
  var nextSearch = next.toString();
  var cur = window.location.search.replace(/^\\?/, '');
  if (nextSearch === cur) return;
  var url = window.location.pathname + (nextSearch ? '?' + nextSearch : '') + window.location.hash;
  window.history.pushState({}, '', url);
}
function mountUrlBridge(){
  syncUrlToState('load');
  window.addEventListener('popstate', function(){ syncUrlToState('runtime'); });
  subscribe(function(){ syncStateToUrl(); });
}

// ─── Condition evaluation (shared with the existing inline scripts) ───
${buildConditionEvalFns({ mobileBreakpoint })}
function actionGatePasses(action){
  if (!action || !action.conditions || !action.conditions.length) return true;
  return evalGroups(action.conditions) !== false;
}

// ─── Condition directives (supersedes the standalone getConditionEvalScript IIFE) ─
// SSR emits the wrapper as <div data-ph-conditions="…" style="display:none">,
// and the directive flips display to '' when evalAll passes. Reading
// store.revision inside Alpine.effect makes conditions reactive to any
// setState write — load-trigger script seeds run synchronously before init,
// state writes from actions / forms / refetch all re-trigger automatically.
// evalAll / evalGroups are defined by buildConditionEvalFns above and read
// from window.__PH_STATE__ (mirrored by setState) + the captured params /
// viewport. Attribute names come straight from walker.ts: 'conditions' and
// 'condition-groups' resolve via Alpine.prefix('data-ph-') set at boot.
Alpine.directive('conditions', function(el, _, opts){
  var conds; try { conds = JSON.parse(el.getAttribute('data-ph-conditions') || '[]'); } catch(e){ conds = []; }
  var logic = el.getAttribute('data-ph-condition-logic') || 'all';
  opts.effect(function(){
    void _store.revision;
    el.style.display = evalAll(conds, logic) ? '' : 'none';
  });
});
Alpine.directive('condition-groups', function(el, _, opts){
  var groups; try { groups = JSON.parse(el.getAttribute('data-ph-condition-groups') || '[]'); } catch(e){ groups = []; }
  opts.effect(function(){
    void _store.revision;
    el.style.display = evalGroups(groups) ? '' : 'none';
  });
});

// ─── Item interpolation ───────────────────────────────────────────────
function walkItem(obj, parts){
  var v = obj;
  for (var i=0; i<parts.length; i++) {
    var p = parts[i];
    if (v == null || typeof v !== 'object') return undefined;
    if (Array.isArray(v) && /^\\d+$/.test(p)) v = v[parseInt(p, 10)];
    else if (p in v) v = v[p];
    else return undefined;
  }
  return v;
}
function interpolateItem(raw, item){
  if (raw == null) return '';
  if (typeof raw !== 'string' || !item) return String(raw);
  return raw.replace(/\\{\\{\\s*item\\.([\\w.\\[\\]]+)\\s*\\}\\}/g, function(_, path){
    var cleaned = path.replace(/\\[(\\d+)\\]/g, '.$1');
    var v = walkItem(item, cleaned.split('.'));
    return v == null ? '' : String(v);
  });
}
function resolveActionKey(raw, item){
  if (!raw) return '';
  var out = interpolateItem(raw, item);
  if (/\\{\\{\\s*item\\./i.test(out)) return '';
  return out || raw;
}

// ─── DOM visibility helpers ───────────────────────────────────────────
function showEl(el, method){
  if (method === 'style') { el.style.display = 'block'; return; }
  el.classList.remove('hidden');
  if (el.id) setVisibility(el.id, 'shown');
}
function hideEl(el, method){
  if (method === 'style') { el.style.display = 'none'; return; }
  el.classList.add('hidden');
  if (el.id) setVisibility(el.id, 'hidden');
}
function toggleEl(el, method){
  if (method === 'style') { el.style.display = el.style.display === 'none' ? 'block' : 'none'; return; }
  var willHide = !el.classList.contains('hidden');
  el.classList.toggle('hidden');
  if (el.id) setVisibility(el.id, willHide ? 'hidden' : 'shown');
}
function applyShowHide(action){
  var el = document.getElementById(action.target);
  if (!el) return;
  var method = action.method || 'class';
  if (action.direction === 'tab') {
    var group = action.group || action.target;
    var panels = document.querySelectorAll('[data-tab-group="' + group + '"]');
    for (var i=0; i<panels.length; i++) hideEl(panels[i], method);
    showEl(el, method);
  } else if (action.direction === 'show') showEl(el, method);
  else if (action.direction === 'hide') hideEl(el, method);
  else toggleEl(el, method);
}
function revertShowHide(action){
  var el = document.getElementById(action.target);
  if (!el) return;
  var method = action.method || 'class';
  if (action.direction === 'show') hideEl(el, method);
  else if (action.direction === 'hide') showEl(el, method);
}

// ─── Cart helpers ─────────────────────────────────────────────────────
function readCartFromStorage(){
  if (!PAGE_ID) return [];
  try {
    var raw = localStorage.getItem('ph-cart-' + PAGE_ID);
    var arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch(e) { return []; }
}
function writeCartToStorage(items){
  if (!PAGE_ID) return;
  try { localStorage.setItem('ph-cart-' + PAGE_ID, JSON.stringify(items)); } catch(e){}
}
function recomputeCartState(items){
  var count = 0, total = 0;
  for (var i=0; i<items.length; i++) {
    var line = items[i] || {};
    var qty = Number(line.quantity) || 0;
    count += qty;
    var amount = (line.item && line.item.price && Number(line.item.price.amount)) || 0;
    total += amount * qty;
  }
  setState('cart:items-json', { kind: 'value', value: JSON.stringify(items), source: 'runtime' }, 'cart');
  setState('cart:count', { kind: 'value', value: String(count), source: 'runtime' }, 'cart');
  setState('cart:total', { kind: 'value', value: String(total), source: 'runtime' }, 'cart');
}
function addToCart(item, qty){
  var items = readCartFromStorage();
  var idKey = (item && (item.priceId || item.id)) || null;
  if (!idKey) return;
  var found = false;
  for (var i=0; i<items.length; i++) {
    var line = items[i];
    var lineKey = (line.item && (line.item.priceId || line.item.id)) || null;
    if (lineKey === idKey) { line.quantity = (Number(line.quantity) || 0) + qty; found = true; break; }
  }
  if (!found) items.push({ item: item, quantity: qty });
  writeCartToStorage(items);
  recomputeCartState(items);
  fireAnalytics('add_to_cart', { value: item && item.price && item.price.amount, currency: item && item.price && item.price.currency });
}
function setCartQuantity(priceId, qty){
  if (!priceId) return;
  var items = readCartFromStorage();
  var next = [];
  for (var i=0; i<items.length; i++) {
    var line = items[i];
    var lineKey = (line.item && (line.item.priceId || line.item.id)) || null;
    if (lineKey === priceId) {
      if (qty > 0) { line.quantity = qty; next.push(line); }
    } else next.push(line);
  }
  writeCartToStorage(next);
  recomputeCartState(next);
}
function removeCartItem(priceId){
  setCartQuantity(priceId, 0);
}

// ─── Action dispatcher ───────────────────────────────────────────────
function fireAction(action, ev, itemContext){
  if (!action || !action.type) return;
  if (!actionGatePasses(action)) return;
  var t = action.type;

  // Link / scroll-to
  if (t === 'link' || t === 'scroll-to') {
    var href = (t === 'scroll-to') ? null : action.href;
    var anchor = (t === 'scroll-to') ? action.anchor : (typeof href === 'string' && href.charAt(0) === '#' ? href.slice(1) : null);
    if (anchor) {
      if (ev) ev.preventDefault();
      if (anchor === 'top') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      var el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Match native <a href="#x"> URL semantics so deep-linking + bookmarks
      // work. Use replaceState to avoid polluting back-stack on internal jumps.
      if (t === 'link') {
        try { history.replaceState(history.state, '', '#' + anchor); } catch(e){}
      }
      return;
    }
    if (t === 'link' && href) {
      if (ev) ev.preventDefault();
      var resolved = interpolateItem(href, itemContext);
      if (action.target === '_blank') window.open(resolved, '_blank', 'noopener,noreferrer');
      else window.location.assign(resolved);
    }
    return;
  }
  if (t === 'open-modal') {
    if (ev) ev.preventDefault();
    var mEl = document.getElementById(action.anchor);
    if (mEl) toggleEl(mEl, 'class');
    return;
  }
  if (t === 'show-hide') {
    if (ev) ev.preventDefault && ev.preventDefault();
    applyShowHide(action);
    return;
  }
  if (t === 'toggle-theme') {
    if (ev) ev.preventDefault();
    var next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch(e){}
    return;
  }
  if (t === 'set-local-storage') {
    try { if (action.key) localStorage.setItem(action.key, action.value || ''); } catch(e){}
    return;
  }
  if (t === 'remove-local-storage') {
    try { if (action.key) localStorage.removeItem(action.key); } catch(e){}
    return;
  }
  if (t === 'copy-to-clipboard') {
    var text = interpolateItem(action.text, itemContext);
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text); return; }
    } catch(e){}
    try {
      var ta = document.createElement('textarea'); ta.value = text;
      ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    } catch(e){}
    return;
  }
  if (t === 'download-file') {
    var url = interpolateItem(action.url, itemContext);
    if (!url) return;
    if (ev) ev.preventDefault();
    var a = document.createElement('a');
    a.href = url;
    var fn = interpolateItem(action.filename, itemContext);
    a.download = fn || '';
    a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    return;
  }
  if (t === 'set-state') {
    if (!action.key) return;
    var sk = resolveActionKey(action.key, itemContext);
    var sv = interpolateItem(action.value, itemContext);
    setState(sk, { kind: action.kind || 'value', value: sv, source: 'runtime' }, 'set-state');
    return;
  }
  if (t === 'toggle-state') {
    if (!action.key) return;
    var tk = resolveActionKey(action.key, itemContext);
    var cur = getStateValue(tk);
    var kind = action.kind || (getState(tk) && getState(tk).kind) || 'flag';
    var pair = action.values || (kind === 'visibility' ? ['shown', 'hidden'] : (kind === 'flag' ? ['on', 'off'] : null));
    if (!pair) return;
    var nx = cur === pair[0] ? pair[1] : pair[0];
    setState(tk, { kind: kind, value: nx, source: 'runtime' }, 'toggle-state');
    return;
  }
  if (t === 'clear-state') {
    if (!action.key) return;
    deleteState(resolveActionKey(action.key, itemContext));
    return;
  }
  if (t === 'increment-state' || t === 'decrement-state') {
    var ik = resolveActionKey(action.key, itemContext);
    if (!ik) return;
    var sign = t === 'increment-state' ? 1 : -1;
    var step = (action.step != null ? action.step : 1) * sign;
    var n = parseInt(getStateValue(ik) || '0', 10) || 0;
    var nv = n + step;
    var maxRaw = action.max;
    var maxN = undefined;
    if (typeof maxRaw === 'number') maxN = maxRaw;
    else if (typeof maxRaw === 'string') {
      if (maxRaw.indexOf('state:') === 0) {
        var rr = parseInt(getStateValue(maxRaw.slice(6)) || '', 10);
        if (isFinite(rr)) maxN = rr;
      } else {
        var pn = parseInt(maxRaw, 10);
        if (isFinite(pn)) maxN = pn;
      }
    }
    var minN = action.min;
    if (action.wrap) {
      if (maxN !== undefined && nv > maxN) nv = minN != null ? minN : 0;
      else if (minN !== undefined && nv < minN) nv = maxN != null ? maxN : minN;
    } else {
      if (maxN !== undefined) nv = Math.min(maxN, nv);
      if (minN !== undefined) nv = Math.max(minN, nv);
    }
    setState(ik, { kind: 'value', value: String(nv), source: 'runtime' }, t);
    return;
  }
  if (t === 'add-to-cart') {
    if (ev) ev.preventDefault();
    // Standalone "Buy X" buttons outside repeaters supply product fields
    // (productId / priceId / title / price) directly on the action. Allow
    // that path when no item context is available.
    if (!itemContext && (action.productId || action.priceId)) {
      itemContext = {
        id: action.productId || action.priceId,
        title: action.title || 'Item',
        price: action.price || 0,
        currency: action.currency || 'usd',
        metadata: { priceId: action.priceId || action.productId, sku: action.sku },
      };
    }
    if (!itemContext) { console.warn('[PageHub] add-to-cart needs item context'); return; }
    var qty = action.quantity || 1;
    if (action.quantityField) {
      var btn = ev && ev.currentTarget;
      var scope = btn && btn.closest('form, section, body');
      var fld = scope && scope.querySelector('[name="' + action.quantityField + '"]');
      var pp = fld ? Number(fld.value) : NaN;
      if (isFinite(pp) && pp > 0) qty = Math.floor(pp);
    }
    var item = itemContext;
    var matchedOk = false;
    if (action.variantMatchStateKey) {
      var vk = interpolateItem(action.variantMatchStateKey, itemContext) || action.variantMatchStateKey;
      var raw = getStateValue(vk);
      if (raw) {
        try {
          var matched = JSON.parse(raw);
          if (matched && typeof matched === 'object') {
            item = Object.assign({}, itemContext, matched, {
              metadata: Object.assign({}, (itemContext.metadata || {}), { priceId: matched.priceId, sku: matched.sku || (itemContext.metadata && itemContext.metadata.sku) })
            });
            matchedOk = true;
          }
        } catch(e){}
      }
    }
    if (itemContext.hasMultipleVariants && !matchedOk) {
      setState('cart:error', { kind: 'value', value: 'Select an option before adding to cart', source: 'runtime' }, 'add-to-cart');
      return;
    }
    setState('cart:error', { kind: 'value', value: '', source: 'runtime' }, 'add-to-cart');
    addToCart(item, qty);
    return;
  }
  if (t === 'toggle-cart') {
    if (ev) ev.preventDefault();
    var cur2 = getStateValue('cart:open');
    setVisibility('cart:open', cur2 === 'shown' ? 'hidden' : 'shown', 'toggle-cart');
    return;
  }
  if (t === 'cart-checkout') {
    if (ev) ev.preventDefault();
    cartCheckout();
    return;
  }
  if (t === 'manage-subscription') {
    if (ev) ev.preventDefault();
    fetch('/api/customer/portal', { method: 'POST', credentials: 'include' })
      .then(function(r){ return r.json(); })
      .then(function(d){ if (d && d.url) window.location.href = d.url; })
      .catch(function(){});
    return;
  }
  if (t === 'agent-send') {
    if (ev) ev.preventDefault();
    var bt = ev && ev.currentTarget;
    var root = bt && bt.closest('[data-ph-agent-chat]');
    if (!root) return;
    var fn2 = (action.field || 'agentMessage');
    fn2 = interpolateItem(fn2, itemContext) || fn2;
    var fld2 = root.querySelector('[name="' + fn2 + '"]');
    var val = fld2 ? (fld2.value || '').trim() : '';
    if (!val) return;
    var cid = root.id || 'ph-chat-default';
    setState(cid + ':outbox', { kind: 'value', value: JSON.stringify({ nonce: Date.now(), value: val }), source: 'runtime' }, 'agent-send');
    if (fld2) { fld2.value = ''; fld2.focus(); }
    return;
  }
}

function cartCheckout(){
  var raw = getStateValue('cart:items-json');
  var items = [];
  try { items = raw ? JSON.parse(raw) : []; } catch(e){}
  if (!items.length || !PAGE_ID) return;
  fetch('/api/stripe/storefront-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageId: PAGE_ID, lineItems: items.map(function(l){
      return { priceId: (l.item && (l.item.priceId || (l.item.metadata && l.item.metadata.priceId))) || null, quantity: l.quantity };
    }) }),
    credentials: 'include'
  }).then(function(r){ return r.json(); }).then(function(d){ if (d && d.url) window.location.href = d.url; }).catch(function(){});
}

// Walk every node carrying actions and wire click/hover. Idempotent —
// elements already attached are skipped via a per-element expando.
function attachActionHandlers(){
  var nodes = document.querySelectorAll('[data-ph-actions]');
  for (var i=0; i<nodes.length; i++) {
    (function(el){
      if (el.__phBoundActions) return;
      el.__phBoundActions = 1;
      var raw = el.getAttribute('data-ph-actions');
      if (!raw) return;
      var actions; try { actions = JSON.parse(raw); } catch(e){ return; }
      if (!Array.isArray(actions) || !actions.length) return;
      var itemContext = readItemContext(el);
      var clickActions = [], enterActions = [], leaveActions = [];
      for (var k=0; k<actions.length; k++) {
        var a = actions[k];
        if (!a || a.trigger === 'load' || a.trigger === 'interval') continue;
        if (a.trigger === 'hover') {
          enterActions.push(a);
          if (a.type === 'set-state' || a.type === 'toggle-state' || a.type === 'clear-state' || a.type === 'show-hide') leaveActions.push(a);
        } else {
          clickActions.push(a);
        }
      }
      if (clickActions.length) el.addEventListener('click', function(e){
        for (var i=0; i<clickActions.length; i++) fireAction(clickActions[i], e, itemContext);
      });
      // Per-element scratch for hover snapshots. WeakMap-style via expando: a
      // local closure variable shared between enter/leave handlers.
      var hoverSnap = {};
      if (enterActions.length) el.addEventListener('mouseenter', function(e){
        for (var i=0; i<enterActions.length; i++) {
          var a = enterActions[i];
          if (a.type === 'set-state' || a.type === 'toggle-state' || a.type === 'clear-state') {
            var snapKey = resolveActionKey(a.key, itemContext);
            if (snapKey && !(snapKey in hoverSnap)) {
              var snapPrev = getState(snapKey);
              // Store full entry shape so leave can restore exact kind/source.
              hoverSnap[snapKey] = snapPrev
                ? { kind: snapPrev.kind, value: snapPrev.value, source: snapPrev.source, existed: true }
                : { existed: false };
            }
          }
          fireAction(a, e, itemContext);
        }
      });
      if (leaveActions.length) el.addEventListener('mouseleave', function(e){
        for (var i=0; i<leaveActions.length; i++) {
          var a = leaveActions[i];
          if (a.type === 'show-hide') { revertShowHide(a); continue; }
          if (a.type === 'set-state' || a.type === 'toggle-state' || a.type === 'clear-state') {
            var k = resolveActionKey(a.key, itemContext);
            if (!k) continue;
            var snap = hoverSnap[k];
            delete hoverSnap[k];
            if (snap && snap.existed) {
              setState(k, { kind: snap.kind, value: snap.value, source: snap.source }, 'hover-revert');
            } else {
              deleteState(k);
            }
          }
        }
      });
    })(nodes[i]);
  }
}

function readItemContext(el){
  // Walk up to find the nearest data-item-id (repeater item). Item context
  // is needed for interpolation of action.value, link.href, etc. Real item
  // payload isn't in the DOM — we approximate with { id } only. For the few
  // surfaces that need full item (add-to-cart), authors stamp data-item-json
  // on the iteration wrapper. Fallback: undefined.
  var cur = el;
  while (cur) {
    if (cur.hasAttribute && cur.hasAttribute('data-item-json')) {
      try { return JSON.parse(cur.getAttribute('data-item-json')); } catch(e){}
    }
    if (cur.hasAttribute && cur.hasAttribute('data-item-id')) {
      return { id: cur.getAttribute('data-item-id') };
    }
    cur = cur.parentElement;
  }
  return null;
}

// ─── State bindings DOM walk ─────────────────────────────────────────
// Idempotent — each per-element loop guards via __phBound* expandos.
function attachStateBindings(){
  // data-state-text: subscribe text content to a state key.
  var textNodes = document.querySelectorAll('[data-state-text]');
  for (var i=0; i<textNodes.length; i++) (function(el){
    if (el.__phBoundStateText) return;
    el.__phBoundStateText = 1;
    var key = el.getAttribute('data-state-text');
    var update = function(){ var v = getStateValue(key); el.textContent = v != null ? v : ''; };
    update();
    subscribe(key, update);
  })(textNodes[i]);

  // data-state-show-when-truthy: toggle hidden based on truthy state.
  var truthyNodes = document.querySelectorAll('[data-state-show-when-truthy]');
  for (var j=0; j<truthyNodes.length; j++) (function(el){
    if (el.__phBoundTruthy) return;
    el.__phBoundTruthy = 1;
    var key = el.getAttribute('data-state-show-when-truthy');
    var update = function(){
      var v = getStateValue(key);
      var truthy = v != null && v !== '' && v !== '0' && v !== 'false';
      el.classList.toggle('hidden', !truthy);
    };
    update();
    subscribe(key, update);
  })(truthyNodes[j]);

  // data-visibility-state-key: subscribe hidden class to visibility entry.
  var visNodes = document.querySelectorAll('[data-visibility-state-key]');
  for (var k=0; k<visNodes.length; k++) (function(el){
    if (el.__phBoundVis) return;
    el.__phBoundVis = 1;
    var key = el.getAttribute('data-visibility-state-key');
    var update = function(){
      var v = getStateValue(key);
      if (v === 'shown') el.classList.remove('hidden');
      else if (v === 'hidden') el.classList.add('hidden');
    };
    update();
    subscribe(key, update);
  })(visNodes[k]);

  // data-state-style-bindings: write state values into inline styles.
  var styleNodes = document.querySelectorAll('[data-state-style-bindings]');
  for (var m=0; m<styleNodes.length; m++) (function(el){
    if (el.__phBoundStyle) return;
    el.__phBoundStyle = 1;
    var raw = el.getAttribute('data-state-style-bindings');
    var bindings; try { bindings = JSON.parse(raw); } catch(e){ return; }
    if (!Array.isArray(bindings)) return;
    var update = function(){
      for (var b=0; b<bindings.length; b++) {
        var bd = bindings[b];
        var val = getStateValue(bd.key);
        if (val == null || val === '') val = bd.defaultValue != null ? bd.defaultValue : '0';
        var out = bd.template ? bd.template.replace(/\\{\\{\\s*value\\s*\\}\\}/g, val) : val;
        if (bd.styleProp.indexOf('--') === 0) el.style.setProperty(bd.styleProp, out);
        else el.style[bd.styleProp] = out;
      }
    };
    update();
    for (var b=0; b<bindings.length; b++) subscribe(bindings[b].key, update);
  })(styleNodes[m]);

  // data-state-modifiers: reactive className composition. The SSR layer
  // resolves modifier *names* to Tailwind class strings, so each binding is
  // shaped { conditions, classes: "<class string>" }. We just toggle the
  // class string when conditions pass.
  var modNodes = document.querySelectorAll('[data-state-modifiers]');
  for (var n=0; n<modNodes.length; n++) (function(el){
    if (el.__phBoundMod) return;
    el.__phBoundMod = 1;
    var raw = el.getAttribute('data-state-modifiers');
    var bindings; try { bindings = JSON.parse(raw); } catch(e){ return; }
    if (!Array.isArray(bindings)) return;
    // Pre-split classes per binding so we don't re-split on every update.
    var classLists = bindings.map(function(bd){
      if (typeof bd.classes === 'string' && bd.classes) return bd.classes.split(/\\s+/).filter(Boolean);
      // Backwards-compat: legacy shape { conditions, modifiers: [...] } toggles
      // the placeholder ph-mod-<name> classes (used to be the only behavior).
      if (Array.isArray(bd.modifiers)) return bd.modifiers.map(function(m){ return 'ph-mod-' + m; });
      return [];
    });
    var subscribedKeys = {};
    var update = function(){
      for (var b=0; b<bindings.length; b++) {
        var bd = bindings[b];
        var pass = evalGroups(bd.conditions) === true;
        var cls = classLists[b];
        for (var ci=0; ci<cls.length; ci++) el.classList.toggle(cls[ci], pass);
      }
    };
    update();
    // Subscribe to any state-keys referenced in conditions for reactivity.
    var collectKeys = function(gs){
      if (!Array.isArray(gs)) return;
      for (var g=0; g<gs.length; g++) {
        var conds = gs[g].conditions || [];
        for (var c=0; c<conds.length; c++) {
          var co = conds[c];
          if ((co.type === 'state' || co.type === 'url-param' || co.type === 'localStorage') && co.key && !subscribedKeys[co.key]) {
            subscribedKeys[co.key] = true;
            var sk = co.type === 'url-param' ? ('url:' + co.key) : co.key;
            subscribe(sk, update);
          }
        }
      }
    };
    for (var b=0; b<bindings.length; b++) collectKeys(bindings[b].conditions);
  })(modNodes[n]);

  // data-state-binding: form input two-way binding.
  var inputNodes = document.querySelectorAll('[data-state-binding]');
  for (var p=0; p<inputNodes.length; p++) (function(el){
    if (el.__phBoundStateBinding) return;
    el.__phBoundStateBinding = 1;
    var raw = el.getAttribute('data-state-binding');
    var b; try { b = JSON.parse(raw); } catch(e){ return; }
    if (!b || !b.key) return;
    var input = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'
      ? el : el.querySelector('input, textarea, select');
    if (!input) return;
    var isChecked = b.mode === 'checked';
    var debounceMs = b.debounceMs || 0;
    var timer = null;
    var lastWrite = null;

    var writeToState = function(v){
      if (timer) clearTimeout(timer);
      var fire = function(){ lastWrite = v; setState(b.key, { kind: 'value', value: v, source: 'runtime' }, 'form-element'); };
      if (debounceMs > 0) timer = setTimeout(fire, debounceMs);
      else fire();
    };
    var syncFromState = function(){
      var v = getStateValue(b.key);
      if (v == null) v = '';
      if (v === lastWrite) return;
      if (document.activeElement === input) return;
      if (isChecked) {
        var want = v === (input.value || 'on') || v === 'on';
        if (input.checked !== want) input.checked = want;
      } else {
        if (input.value !== v) input.value = v;
      }
    };

    var initial = getStateValue(b.key);
    if (initial == null || initial === '') {
      var dv = b.defaultValue;
      if (dv) setState(b.key, { kind: 'value', value: String(dv), source: 'load' }, 'form-element');
    } else {
      syncFromState();
    }
    input.addEventListener(isChecked ? 'change' : 'input', function(){
      if (isChecked) writeToState(input.checked ? (input.value || 'on') : '');
      else writeToState(input.value);
    });
    subscribe(b.key, syncFromState);
  })(inputNodes[p]);

  // data-publish-state-keys: on a connector-backed wrapper, publish meta.
  // (Real value writes happen in repeater refetch; on initial load, SSR has
  // already populated the items — we just publish a count.)
  var pubNodes = document.querySelectorAll('[data-publish-state-keys]');
  for (var q=0; q<pubNodes.length; q++) (function(el){
    if (el.__phBoundPublish) return;
    el.__phBoundPublish = 1;
    var raw = el.getAttribute('data-publish-state-keys');
    var keys; try { keys = JSON.parse(raw); } catch(e){ return; }
    if (!keys || typeof keys !== 'object') return;
    var count = el.querySelectorAll('[data-item-id]').length;
    if (keys.count) setState(keys.count, { kind: 'value', value: String(count), source: 'load' }, 'publish');
    if (keys.totalCount) setState(keys.totalCount, { kind: 'value', value: String(count), source: 'load' }, 'publish');
  })(pubNodes[q]);

  // data-computed-state-bindings: declarative derived-state writes. Each
  // binding declares { key, from?, compute }. Mirrors computedState.ts on the
  // React path. Supported compute kinds:
  //   - variant-match              (PDP variant pickers)
  //   - variant-axis-availability  (chips' "unavailable" gating)
  //   - all-truthy                 (form complete? CTA enable)
  //   - first-truthy               (fallback chain)
  //   - join                       (state CSV builder)
  var cmpNodes = document.querySelectorAll('[data-computed-state-bindings]');
  for (var cn=0; cn<cmpNodes.length; cn++) (function(el){
    if (el.__phBoundComputed) return;
    el.__phBoundComputed = 1;
    var raw = el.getAttribute('data-computed-state-bindings');
    var bindings; try { bindings = JSON.parse(raw); } catch(e){ return; }
    if (!Array.isArray(bindings) || !bindings.length) return;
    // Walk DOM upward to find the item context. interp() resolves
    // {{item.X}} tokens against this. For PDP-scoped variant-match the
    // item context is the product (carries variantMapJson + optionNamesCsv).
    var itemContext = readItemContext(el);
    var interp = function(raw){
      if (typeof raw !== 'string' || !raw) return raw == null ? '' : String(raw);
      return interpolateItem(raw, itemContext);
    };
    var subscribed = {};
    var subKey = function(k){ if (!k || subscribed[k]) return; subscribed[k] = true; subscribe(k, update); };
    var update = function(){
      for (var i=0; i<bindings.length; i++) {
        var bd = bindings[i]; if (!bd || !bd.compute) continue;
        var outKey = interp(bd.key); if (!outKey) continue;
        var nextVal = runComputed(bd, interp, subKey);
        if (getStateValue(outKey) === nextVal) continue;
        setState(outKey, { kind: 'value', value: nextVal, source: 'computed' }, 'computed');
      }
    };
    update();
  })(cmpNodes[cn]);
}

function toAxisArray(value){
  if (!value) return [];
  if (Object.prototype.toString.call(value) === '[object Array]') return value;
  return String(value).split(',').map(function(s){ return s.replace(/^\\s+|\\s+$/g, ''); }).filter(Boolean);
}
function axisToSlot(axes){
  var out = {};
  for (var i=0; i<axes.length && i<3; i++) out[axes[i]] = 'option' + (i+1);
  return out;
}
function parseVariantMap(raw){
  if (!raw) return [];
  try { var p = JSON.parse(raw); return Object.prototype.toString.call(p) === '[object Array]' ? p : []; } catch(e){ return []; }
}
function hasUnresolvedItemToken(s){ return /\\{\\{\\s*item\\./i.test(String(s)); }

function runComputed(binding, interp, subKey){
  var c = binding.compute;
  var t = c && c.type;
  var i, k, v;
  if (t === 'all-truthy') {
    var fromKeys = binding.from || [];
    for (i=0; i<fromKeys.length; i++) { k = interp(fromKeys[i]); if (k) { subKey(k); if (getStateValue(k) == null || getStateValue(k) === '') return ''; } }
    return fromKeys.length ? 'on' : '';
  }
  if (t === 'first-truthy') {
    var fk = binding.from || [];
    for (i=0; i<fk.length; i++) { k = interp(fk[i]); if (!k) continue; subKey(k); v = getStateValue(k); if (v != null && v !== '') return v; }
    return '';
  }
  if (t === 'join') {
    var sep = c.separator != null ? c.separator : ',';
    var fk2 = binding.from || [];
    var vals = [];
    for (i=0; i<fk2.length; i++) { k = interp(fk2[i]); if (!k) continue; subKey(k); v = getStateValue(k); if (v != null && v !== '') vals.push(v); }
    return vals.join(sep);
  }
  if (t === 'variant-match') {
    var rawMap = interp(c.variantMap);
    var rawAxes = typeof c.axes === 'string' ? interp(c.axes) : (c.axes || []).join(',');
    if (hasUnresolvedItemToken(rawMap) || hasUnresolvedItemToken(rawAxes)) return '';
    var variants = parseVariantMap(rawMap);
    var axes = toAxisArray(rawAxes);
    var slots = axisToSlot(axes);
    var sel = {};
    for (i=0; i<axes.length; i++) {
      var sk = interp(c.axisKeyTemplate.replace(/%axis%/g, axes[i]));
      if (hasUnresolvedItemToken(sk)) return '';
      subKey(sk);
      v = getStateValue(sk);
      if (v != null && v !== '') sel[axes[i]] = v;
    }
    var complete = axes.length > 0;
    for (i=0; i<axes.length; i++) if (!sel[axes[i]]) { complete = false; break; }
    if (!complete) return '';
    for (i=0; i<variants.length; i++) {
      var vv = variants[i];
      var ok = true;
      for (var ai=0; ai<axes.length; ai++) if (vv[slots[axes[ai]]] !== sel[axes[ai]]) { ok = false; break; }
      if (ok && vv.inventory !== 0) return JSON.stringify(vv);
    }
    return '';
  }
  if (t === 'variant-axis-availability') {
    var rawMap2 = interp(c.variantMap);
    var rawOther = typeof c.otherAxes === 'string' ? interp(c.otherAxes) : (c.otherAxes || []).join(',');
    if (hasUnresolvedItemToken(rawMap2) || hasUnresolvedItemToken(rawOther)) return '';
    var variants2 = parseVariantMap(rawMap2);
    var otherAxes = toAxisArray(rawOther);
    var allAxes = [c.axis].concat(otherAxes);
    var slots2 = axisToSlot(allAxes);
    var sel2 = {};
    for (i=0; i<otherAxes.length; i++) {
      var sk2 = interp(c.axisKeyTemplate.replace(/%axis%/g, otherAxes[i]));
      if (hasUnresolvedItemToken(sk2)) return '';
      subKey(sk2);
      v = getStateValue(sk2);
      if (v != null && v !== '') sel2[otherAxes[i]] = v;
    }
    var candidates = {};
    for (i=0; i<variants2.length; i++) {
      var cand = variants2[i][slots2[c.axis]];
      if (typeof cand === 'string') candidates[cand] = true;
    }
    var unavailable = [];
    for (var candName in candidates) {
      var live = false;
      for (i=0; i<variants2.length; i++) {
        var vr = variants2[i];
        if (vr[slots2[c.axis]] !== candName) continue;
        if (vr.inventory === 0) continue;
        var matches = true;
        for (var oi=0; oi<otherAxes.length; oi++) {
          if (!sel2[otherAxes[oi]]) continue;
          if (vr[slots2[otherAxes[oi]]] !== sel2[otherAxes[oi]]) { matches = false; break; }
        }
        if (matches) { live = true; break; }
      }
      if (!live) unavailable.push(candName);
    }
    return unavailable.join(',');
  }
  return '';
}

// ─── Cart drawer visibility init ────────────────────────────────────
function initCartDrawerVisibility(){
  // Cart drawers usually carry data-visibility-state-key="cart:open".
  // No-op here — handled by attachStateBindings.
}

// ─── Form submit dispatcher ────────────────────────────────────────
// Matches the routing matrix in submitFormProduction.ts. The data-ph-form
// JSON stamped by Form.toHTML carries submissionType + per-type payload bits.
function attachForms(){
  var forms = document.querySelectorAll('form');
  for (var i=0; i<forms.length; i++) (function(form){
    if (form.__phBoundForm) return;
    form.__phBoundForm = 1;
    var metaRaw = form.getAttribute('data-ph-form');
    var meta = null;
    if (metaRaw) { try { meta = JSON.parse(metaRaw); } catch(e){} }
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var fd = new FormData(form);
      // Honeypot.
      if (fd.get('_ph_hp')) return;
      var data = {}; fd.forEach(function(v, k){ if (k !== '_ph_hp') data[k] = v; });
      var t = (meta && meta.submissionType) || 'email';
      var formName = (meta && meta.formName) || form.getAttribute('data-form-name') || 'form';
      if (t === 'iframe') return;
      if (t === 'custom' && meta && meta.action) {
        fetch(meta.action, {
          method: meta.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).catch(function(){});
      } else if (t === 'agent' && meta && meta.agentId) {
        fetch('/api/agents/' + encodeURIComponent(meta.agentId) + '/intake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageId: PAGE_ID, formData: data }),
          credentials: 'include',
        }).catch(function(){});
      } else {
        // email / webhook / collection — all routed through /api/submissions
        // with mode-specific extras. Mirrors SaveSubmissions in the SDK.
        var body = { pageId: PAGE_ID, formData: data, formName: formName };
        if (meta) {
          if (meta.mailto) body.mailTo = meta.mailto;
          if (t === 'webhook' && meta.webhookUrl) body.webhookUrl = meta.webhookUrl;
          if (t === 'collection' && meta.collectionSlug) {
            body.collection = meta.collectionSlug;
            if (meta.collectionFieldMap) body.collectionFieldMap = meta.collectionFieldMap;
            if (meta.collectionSkipEmail) body.skipEmail = true;
          }
        }
        fetch('/api/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).catch(function(){});
      }
      fireAnalytics('form_submit', { formName: formName });
      try { form.reset(); } catch(e){}
    });
  })(forms[i]);
}

// ─── Connector refetch watcher ─────────────────────────────────────
// Walk a value via dot path, supporting numeric indices (matches React's
// walkPath fallback). Returns null when path doesn't resolve.
function walkSlotPath(obj, parts){
  var v = obj;
  for (var i=0; i<parts.length; i++) {
    if (v == null) return null;
    var p = parts[i];
    if (Object.prototype.toString.call(v) === '[object Array]' && /^\\d+$/.test(p)) v = v[parseInt(p,10)];
    else if (typeof v === 'object' && p in v) v = v[p];
    else return null;
  }
  return v;
}
// Substitute {{slot:<path>}} markers in an HTML string with values from an
// item. Empty / missing paths → empty string. HTML-escapes string values (the
// runtime ships raw template HTML; refetched payloads come from JSON and may
// carry < or & in titles).
function renderTemplate(tmpl, item){
  return String(tmpl).replace(/\\{\\{slot:([\\w.]+)\\}\\}/g, function(_, path){
    var v = walkSlotPath(item, path.split('.'));
    if (v == null) return '';
    return String(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  });
}
// Reconcile child rows of a repeater wrapper against a new items array.
// Keeps DOM nodes with unchanged item ids (preserves focus, animations);
// replaces or inserts new rows; removes stale rows.
function reconcileItems(wrapper, template, items){
  if (!template) return;
  // Skip the template element + non-data-item-id children when finding rows.
  var existing = wrapper.querySelectorAll(':scope > [data-item-id]');
  var byId = {};
  for (var i=0; i<existing.length; i++) byId[existing[i].getAttribute('data-item-id')] = existing[i];
  var seen = {};
  var anchor = null; // previous sibling for insertion
  for (var j=0; j<items.length; j++) {
    var item = items[j];
    var id = String(item && (item.id != null ? item.id : j));
    seen[id] = true;
    var cur = byId[id];
    if (cur) {
      // Reorder if necessary — append after anchor (or to top).
      var expectedNext = anchor ? anchor.nextElementSibling : wrapper.firstElementChild;
      if (cur !== expectedNext) wrapper.insertBefore(cur, anchor ? anchor.nextSibling : wrapper.firstChild);
      anchor = cur;
      continue;
    }
    // Build new row from template.
    var html = renderTemplate(template, item);
    // Use a div wrapper to parse fragment; first child is the row.
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    var row = tmp.firstElementChild;
    if (!row) continue;
    row.setAttribute('data-item-id', id);
    wrapper.insertBefore(row, anchor ? anchor.nextSibling : wrapper.firstChild);
    anchor = row;
  }
  // Remove rows that aren't in the new items list.
  for (var k=0; k<existing.length; k++) {
    var idk = existing[k].getAttribute('data-item-id');
    if (!seen[idk]) existing[k].parentNode && existing[k].parentNode.removeChild(existing[k]);
  }
}

// Cart drawer items — re-renders the list whenever cart:items-json changes.
// CartItems.craft toHTML emits a placeholder div[data-ph-cart-items] with
// the empty-state / row class names stamped as data-attrs so the same theme
// resolves on first paint. Delegated click handlers wire +/-/remove.
function escapeHTML(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function attachCartItems(){
  var nodes = document.querySelectorAll('[data-ph-cart-items]');
  for (var i=0; i<nodes.length; i++) (function(el){
    if (el.__phBoundCartItems) return;
    el.__phBoundCartItems = 1;
    var cls = function(name, fallback){ return el.getAttribute('data-' + name) || fallback; };
    var emptyBox = cls('empty-class', 'text-base-content/50 flex flex-col items-center justify-center gap-4 py-16');
    var emptyText = cls('empty-text', 'Your cart is empty');
    var emptyTextCls = cls('empty-text-class', 'text-sm');
    var listCls = cls('list-class', 'flex flex-col gap-4');
    var rowCls = cls('row-class', 'flex gap-4');
    var imgCls = cls('image-class', 'size-20 shrink-0 rounded-lg object-cover');
    var bodyCls = cls('body-class', 'flex flex-1 flex-col gap-1');
    var titleCls = cls('title-class', 'line-clamp-2 text-sm font-semibold');
    var variantCls = cls('variant-class', 'text-base-content/60 text-xs');
    var priceCls = cls('price-class', 'text-primary text-sm font-bold');
    var controlsCls = cls('controls-class', 'mt-1 flex items-center gap-2');
    var qtyCls = cls('quantity-class', 'min-w-[1.5rem] text-center text-sm font-medium');
    var btnCls = cls('control-button-class', 'btn btn-ghost btn-xs btn-circle');
    var removeBtnCls = cls('remove-button-class', 'btn btn-ghost btn-xs btn-circle text-error ml-auto');
    var render = function(){
      var items = readCartFromStorage();
      if (!items.length) { el.innerHTML = '<div class="' + escapeHTML(emptyBox) + '"><p class="' + escapeHTML(emptyTextCls) + '">' + escapeHTML(emptyText) + '</p></div>'; return; }
      var html = '<div class="' + escapeHTML(listCls) + '">';
      for (var j=0; j<items.length; j++) {
        var line = items[j] || {}; var it = line.item || {}; var qty = Number(line.quantity) || 0;
        var pid = it.priceId || it.id || '';
        html += '<div class="' + escapeHTML(rowCls) + '">';
        if (it.image) html += '<img src="' + escapeHTML(it.image) + '" alt="' + escapeHTML(it.title || '') + '" class="' + escapeHTML(imgCls) + '" />';
        html += '<div class="' + escapeHTML(bodyCls) + '">';
        html += '<p class="' + escapeHTML(titleCls) + '">' + escapeHTML(it.title || '') + '</p>';
        if (it.variantLabel) html += '<p class="' + escapeHTML(variantCls) + '">' + escapeHTML(it.variantLabel) + '</p>';
        if (it.priceFormatted) html += '<p class="' + escapeHTML(priceCls) + '">' + escapeHTML(it.priceFormatted) + '</p>';
        html += '<div class="' + escapeHTML(controlsCls) + '">';
        html += '<button type="button" data-ph-cart-action="dec" data-ph-cart-priceid="' + escapeHTML(pid) + '" class="' + escapeHTML(btnCls) + '">&minus;</button>';
        html += '<span class="' + escapeHTML(qtyCls) + '">' + qty + '</span>';
        html += '<button type="button" data-ph-cart-action="inc" data-ph-cart-priceid="' + escapeHTML(pid) + '" class="' + escapeHTML(btnCls) + '">+</button>';
        html += '<button type="button" data-ph-cart-action="remove" data-ph-cart-priceid="' + escapeHTML(pid) + '" class="' + escapeHTML(removeBtnCls) + '">&times;</button>';
        html += '</div></div></div>';
      }
      html += '</div>';
      el.innerHTML = html;
    };
    if (!el.__phCartClickBound) {
      el.__phCartClickBound = 1;
      el.addEventListener('click', function(ev){
        var btn = ev.target && ev.target.closest && ev.target.closest('[data-ph-cart-action]');
        if (!btn) return;
        var pid = btn.getAttribute('data-ph-cart-priceid');
        var act = btn.getAttribute('data-ph-cart-action');
        if (!pid) return;
        var items = readCartFromStorage();
        var current = 0;
        for (var k=0; k<items.length; k++) {
          var lk = items[k].item && (items[k].item.priceId || items[k].item.id);
          if (lk === pid) { current = Number(items[k].quantity) || 0; break; }
        }
        if (act === 'inc') setCartQuantity(pid, current + 1);
        else if (act === 'dec') setCartQuantity(pid, current - 1);
        else if (act === 'remove') removeCartItem(pid);
      });
    }
    render();
    // Re-render whenever cart:items-json mutates. Alpine.effect runs the
    // body synchronously once (the render() call above is now redundant but
    // harmless — render is idempotent), then re-runs on store mutation.
    Alpine.effect(function(){ void _store.entries['cart:items-json']; render(); });
  })(nodes[i]);
}

function attachConnectorRefetch(){
  var wrappers = document.querySelectorAll('[data-connector-id][data-state-inputs]');
  for (var i=0; i<wrappers.length; i++) (function(el){
    if (el.__phBoundConnector) return;
    el.__phBoundConnector = 1;
    var provider = el.getAttribute('data-connector-id');
    var collection = el.getAttribute('data-binding-collection') || el.getAttribute('data-binding-key') || '';
    var inputsRaw = el.getAttribute('data-state-inputs');
    var inputs; try { inputs = JSON.parse(inputsRaw); } catch(e){ return; }
    if (!inputs || typeof inputs !== 'object') return;
    // Cache the template HTML once — DOM mutations on reconcile shouldn't
    // affect the source-of-truth template.
    var tplEl = el.querySelector(':scope > template[data-item-template]');
    var templateHTML = tplEl ? tplEl.innerHTML : '';
    // Map { fetchOpt: stateKey } → trigger refetch whenever any subscribed key changes.
    var refetch = debounce(function(){
      if (!PAGE_ID || !provider) return;
      var params = new URLSearchParams();
      params.set('pageId', PAGE_ID);
      params.set('provider', provider);
      // bindingKey is "<collection>::<filterHash>" — first segment is collection.
      var col = collection.split('::')[0] || 'products';
      params.set('collection', col);
      for (var opt in inputs) {
        var v = getStateValue(inputs[opt]);
        if (v != null && v !== '') params.set(opt, v);
      }
      // Allow tests / pre-population to short-circuit the network. The
      // smoke harness stamps __PH_CONNECTOR__[provider][col] = [...items];
      // when present, skip fetch and reconcile directly.
      var seed = window.__PH_CONNECTOR__ && window.__PH_CONNECTOR__[provider] && window.__PH_CONNECTOR__[provider][col];
      var promise;
      if (Object.prototype.toString.call(seed) === '[object Array]') {
        promise = Promise.resolve({ items: seed });
      } else {
        promise = fetch(PUBLIC_DATA_ENDPOINT + '?' + params.toString()).then(function(r){ return r.json(); });
      }
      promise
        .then(function(d){
          if (!d || Object.prototype.toString.call(d.items) !== '[object Array]') return;
          // DOM swap via per-item template substitution.
          reconcileItems(el, templateHTML, d.items);
          // Also let author scripts hook in if needed.
          var ev = new CustomEvent('pagehub:repeater-refresh', { detail: { collection: col, items: d.items } });
          el.dispatchEvent(ev);
          // Publish counts to publishStateKeys, if declared.
          var pubRaw = el.getAttribute('data-publish-state-keys');
          var pub; try { pub = JSON.parse(pubRaw || ''); } catch(e){}
          if (pub && pub.count) setState(pub.count, { kind: 'value', value: String(d.items.length), source: 'runtime' }, 'publish');
          if (pub && pub.totalCount) setState(pub.totalCount, { kind: 'value', value: String(d.items.length), source: 'runtime' }, 'publish');
        }).catch(function(){});
    }, 100);
    // One Alpine.effect reading every subscribed state key; any change to
    // any input re-triggers refetch (debounced inside). Replaces the
    // per-key subscribe() loop for fewer effect runners.
    Alpine.effect(function(){
      for (var opt in inputs) void _store.entries[inputs[opt]];
      refetch();
    });
  })(wrappers[i]);
}

function debounce(fn, ms){
  var t = null;
  return function(){
    var args = arguments;
    if (t) clearTimeout(t);
    t = setTimeout(function(){ fn.apply(null, args); }, ms);
  };
}

// ─── Customer token detect ────────────────────────────────────────
function detectCustomerToken(){
  var params = new URLSearchParams(window.location.search);
  var token = params.get('token');
  if (!token) return;
  params.delete('token');
  var qs = params.toString();
  var clean = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
  window.history.replaceState({}, '', clean);
  fetch('/api/customer/verify?token=' + encodeURIComponent(token))
    .then(function(r){ if (!r.ok) return null; return fetch('/api/customer/me', { credentials: 'include' }); })
    .then(function(r){ return r && r.ok ? r.json() : null; })
    .then(function(data){
      var status = data ? 'logged-in' : 'logged-out';
      setState('auth:status', { kind: 'value', value: status, source: 'runtime' }, 'customer-token');
      if (data) {
        setState('customer:email', { kind: 'value', value: data.email || '', source: 'runtime' }, 'customer');
        setState('customer:name', { kind: 'value', value: data.name || '', source: 'runtime' }, 'customer');
        setState('customer:orderCount', { kind: 'value', value: String(data.orderCount || 0), source: 'runtime' }, 'customer');
        setState('customer:totalSpent', { kind: 'value', value: String(data.totalSpent || 0), source: 'runtime' }, 'customer');
      }
    })
    .catch(function(){});
}

// ─── Analytics stubs ──────────────────────────────────────────────
function ensureAnalyticsStubs(){
  var w = window;
  if (typeof w.dataLayer === 'undefined') w.dataLayer = [];
  if (typeof w.gtag !== 'function') w.gtag = function(){ w.dataLayer.push(arguments); };
  if (typeof w.fbq !== 'function') {
    w.fbq = function(){ (w.fbq.queue = w.fbq.queue || []).push(arguments); };
  }
}
function fireAnalytics(event, params){
  var w = window;
  try {
    if (typeof w.gtag === 'function') w.gtag('event', event, params || {});
    if (event === 'form_submit' && typeof w.fbq === 'function') w.fbq('track', 'Lead');
    if (event === 'add_to_cart' && typeof w.fbq === 'function') w.fbq('track', 'AddToCart', params || {});
    if (w.dataLayer && typeof w.dataLayer.push === 'function') w.dataLayer.push(Object.assign({ event: event }, params || {}));
  } catch(e){}
}

// ─── Map mount (Leaflet via CDN) ──────────────────────────────────
var LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
var LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
var TILE_URLS = {
  osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  'cartodb-positron': 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  'cartodb-dark': 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  'cartodb-voyager': 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
};
function loadLeaflet(){
  return new Promise(function(resolve, reject){
    if (window.L) return resolve(window.L);
    var link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = LEAFLET_CSS;
    document.head.appendChild(link);
    var script = document.createElement('script');
    script.src = LEAFLET_JS; script.async = true;
    script.onload = function(){ resolve(window.L); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}
function mountMaps(){
  var nodes = document.querySelectorAll('[data-ph-map]');
  if (!nodes.length) return;
  loadLeaflet().then(function(L){
    for (var i=0; i<nodes.length; i++) {
      var el = nodes[i];
      var raw = el.getAttribute('data-ph-map');
      var cfg; try { cfg = JSON.parse(raw); } catch(e){ continue; }
      if (!cfg || (!cfg.lat && !cfg.lng)) continue;
      // Clear the static fallback <img>.
      el.innerHTML = '';
      var map = L.map(el, { scrollWheelZoom: cfg.type === 'interactive', dragging: cfg.type === 'interactive' }).setView([cfg.lat, cfg.lng], cfg.zoom || 13);
      L.tileLayer(TILE_URLS[cfg.tileStyle] || TILE_URLS.osm, { attribution: '&copy; OpenStreetMap' }).addTo(map);
      var pts = cfg.points || [];
      for (var j=0; j<pts.length; j++) {
        var p = pts[j];
        var m = L.marker([p.lat, p.lng]).addTo(map);
        if (p.title || p.description) m.bindPopup('<b>' + (p.title || '') + '</b>' + (p.description ? '<br/>' + p.description : ''));
      }
    }
  }).catch(function(){});
}

// ─── Init ─────────────────────────────────────────────────────────
function init(){
  // 1. Cart bridge already ran in <head>; seedFromWindow picks it up.
  seedFromWindow();
  // 2. URL bridge
  mountUrlBridge();
  // 3. DOM bindings
  attachStateBindings();
  // 4. Actions
  attachActionHandlers();
  // 5. Forms
  attachForms();
  // 6. Connector refetch
  attachConnectorRefetch();
  // 7. Customer token
  detectCustomerToken();
  // 8. Analytics stubs
  ensureAnalyticsStubs();
  // 9. Map (async)
  mountMaps();
  // 10. Kick Alpine to walk the live DOM and pick up our prefix-scoped
  // directives (data-ph-conditions, data-ph-condition-groups). Alpine.start
  // only auto-walks elements rooted at an x-data scope, and the static
  // export deliberately ships no x-data anywhere — initTree(body) is the
  // unscoped entry point that fires the directive handlers regardless.
  // Idempotent: Alpine guards each element's per-attribute cleanups, so a
  // second initTree on the same tree just no-ops.
  try { Alpine.initTree(document.body); } catch(e) {}

  // Hydration signal — late-load inject.head scripts wait for this event /
  // attribute before mutating the DOM. Mirrors the React-path useViewerSetup
  // signal so the same author-side patterns work in both routes. Idempotent
  // via attribute guard.
  try {
    var docEl = document.documentElement;
    if (!docEl.hasAttribute('data-ph-hydrated')) {
      docEl.setAttribute('data-ph-hydrated', '1');
      document.dispatchEvent(new Event('pagehub:hydrated'));
    }
  } catch (e) {}

  // Re-render bindings on state changes is implicit — listeners attached above.
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
// Multi-shot init (window.load + 2× rAF + 500ms + 1500ms) was needed when the
// runtime shipped through pages-router's dangerouslySetInnerHTML — React
// hydration could swap DOM nodes after our attach pass, dropping __phBound*
// expandos. The flagged path now goes through pages/api/published/[...slug].ts
// which is framework-less, so a single init is enough. Late-injected DOM
// (custom JS handler, third-party script) goes through rebind() below.

// Re-walk all data-* attach points. Use after injecting new DOM (custom JS
// handler that appends an element, third-party script, etc.). Idempotent —
// each attach function guards via a per-element flag.
function rebind(root){
  // Default scope is the whole document, but callers can pass a subtree.
  // Each attachX function uses querySelectorAll on document, so we only
  // re-run them all; cheap (<1ms typical) and safe (idempotent guards).
  void root;
  attachStateBindings();
  attachActionHandlers();
  attachForms();
  attachCartItems();
  attachConnectorRefetch();
  // Pick up late-injected DOM that carries our directive attributes
  // (data-ph-conditions, data-ph-condition-groups). Alpine guards per-element
  // so a re-walk is idempotent.
  try { Alpine.initTree(root && root.nodeType === 1 ? root : document.body); } catch(e) {}
}

// Expose a tiny debug surface for tests / authors.
window.__PH_RUNTIME__ = {
  getState: getState,
  getStateValue: getStateValue,
  setState: setState,
  listStates: listStates,
  subscribe: subscribe,
  addToCart: addToCart,
  setCartQuantity: setCartQuantity,
  removeCartItem: removeCartItem,
  rebind: rebind
};
})();
</script>`;
}
