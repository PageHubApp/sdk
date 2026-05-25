// init / rebind / __PH_RUNTIME__ debug surface.
//
// Authored as a real TS function; `stringifyChunk` lifts the body into the
// runtime IIFE. Globals declared in [runtime-globals.d.ts](./runtime-globals.d.ts).

import { stringifyChunk } from "./stringifyChunk";

export const BOOTSTRAP_CHUNK = stringifyChunk(function $bootstrap() {
  // Pull cross-chunk functions from the runtime registry. STRING property
  // keys survive minification (see staticPublishRuntime.ts preamble). All
  // definer chunks have already populated __phRT by the time this chunk
  // runs (bootstrap is the last chunk in the IIFE concat order).
  const {
    getState,
    getStateValue,
    setState,
    listStates,
    subscribe,
    seedFromWindow,
    mountUrlBridge,
    detectCustomerToken,
    ensureAnalyticsStubs,
    mountMaps,
    addToCart,
    setCartQuantity,
    removeCartItem,
  } = __phRT;

  function init() {
    seedFromWindow();
    mountUrlBridge();
    detectCustomerToken();
    ensureAnalyticsStubs();
    mountMaps();
    try {
      Alpine.initTree(document.body);
    } catch (e) {}
    try {
      const docEl = document.documentElement;
      if (!docEl.hasAttribute("data-ph-hydrated")) {
        docEl.setAttribute("data-ph-hydrated", "1");
        document.dispatchEvent(new Event("pagehub:hydrated"));
      }
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Re-walk attach points for late-injected DOM (custom JS handlers, 3rd-party
  // scripts). Idempotent via Alpine's _x_attributeCleanups.
  function rebind(root?: Element | Document) {
    try {
      Alpine.initTree(root || document.body);
    } catch (e) {}
  }

  window.__PH_RUNTIME__ = {
    getState: getState,
    getStateValue: getStateValue,
    setState: setState,
    listStates: listStates,
    subscribe: subscribe,
    addToCart: addToCart,
    setCartQuantity: setCartQuantity,
    removeCartItem: removeCartItem,
    rebind: rebind,
  };
});
