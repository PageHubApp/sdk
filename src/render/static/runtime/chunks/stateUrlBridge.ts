// URL ↔ state bridge: `url:*` state keys mirror `location.search` both ways.
//
// Authored as a real TS function; `stringifyChunk` lifts the body into the
// runtime IIFE right after the state chunk, whose registry functions it reads
// from `__phRT`. Globals declared in [runtime-globals.d.ts](./runtime-globals.d.ts).

import { stringifyChunk } from "./stringifyChunk";

export const STATE_URL_BRIDGE_CHUNK = stringifyChunk(function $stateUrlBridge() {
  // Cross-chunk function bindings via runtime registry. See
  // staticPublishRuntime.ts preamble for the why.
  const { setState, listStates, subscribe } = __phRT;

  const URL_PREFIX = PH_URL_PREFIX;
  function syncUrlToState(source: string) {
    const params = new URLSearchParams(window.location.search);
    const seen: Record<string, boolean> = {};
    params.forEach(function (v, k) {
      seen[k] = true;
      setState(
        URL_PREFIX + k,
        { kind: "value", value: v, source: source },
        "url-bridge"
      );
    });
    const all = listStates();
    for (let i = 0; i < all.length; i++) {
      const entry = all[i];
      if (entry.key.indexOf(URL_PREFIX) !== 0) continue;
      const param = entry.key.slice(URL_PREFIX.length);
      if (!seen[param] && entry.value) {
        setState(
          entry.key,
          { kind: "value", value: "", source: source },
          "url-bridge"
        );
      }
    }
  }
  function syncStateToUrl() {
    const next = new URLSearchParams();
    const all = listStates();
    for (let i = 0; i < all.length; i++) {
      const entry = all[i];
      if (entry.key.indexOf(URL_PREFIX) !== 0) continue;
      const param = entry.key.slice(URL_PREFIX.length);
      if (typeof entry.value === "string" && entry.value.length > 0) {
        next.set(param, entry.value);
      }
    }
    const nextSearch = next.toString();
    const cur = window.location.search.replace(/^\?/, "");
    if (nextSearch === cur) return;
    const url =
      window.location.pathname +
      (nextSearch ? "?" + nextSearch : "") +
      window.location.hash;
    window.history.pushState({}, "", url);
  }
  function mountUrlBridge() {
    syncUrlToState("load");
    window.addEventListener("popstate", function () {
      syncUrlToState("runtime");
    });
    subscribe(function () {
      syncStateToUrl();
    });
  }

  Object.assign(__phRT, { mountUrlBridge });
});
