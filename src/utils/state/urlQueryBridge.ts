/**
 * URL query ↔ state bridge — two-way mirror between `window.location.search`
 * and registry entries under the `url:*` namespace.
 *
 * This is the single replacement for the old `useUrlQueryCommerce` hook +
 * `pagehub:url-query-changed` CustomEvent. Storefront blocks (filter, search,
 * facet, pagination, category nav) drive the URL by writing `url:<param>`
 * state via standard `set-state` / `increment-state` / `clear-state` actions.
 * Connectors subscribe to the same keys via `dataSource.stateInputs`.
 *
 * Direction 1 — URL → state:
 *   - On mount, parse `window.location.search` and write each param to
 *     `state["url:<key>"]` with `lastWriter: "url-bridge"`.
 *   - Listen for `popstate`; reparse and re-publish on every navigation.
 *
 * Direction 2 — state → URL:
 *   - Subscribe to the global state tick. When any `url:*` key differs from
 *     the corresponding `URLSearchParams.get()` value, build a fresh search
 *     string from the current snapshot and call `window.history.pushState`.
 *   - The bridge tags its own writes with `lastWriter: "url-bridge"`. The
 *     loop is naturally broken by value comparison: after the bridge writes
 *     state from a popstate, the next tick rebuilds the URL → matches the
 *     current `location.search` byte-for-byte → pushState skipped.
 *
 * Empty / missing values omit the param from the URL. Unknown writers (e.g.
 * `set-state` from author code) flow through both directions transparently.
 */

import { setState, getStateValue, listStates, subscribe } from "./stateRegistry";
import { STATE_PREFIX } from "./keys";

const URL_PREFIX = STATE_PREFIX.url;
const BRIDGE_WRITER = "url-bridge";

let _mounted = false;
let _detach: (() => void) | null = null;

function syncUrlToState(source: "load" | "runtime"): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  // Track which url:* keys exist in the URL so we can clear stale registry
  // entries (e.g. user navigated away from `?q=hi` to `/products`).
  const seen = new Set<string>();
  for (const [k, v] of params.entries()) {
    seen.add(k);
    setState(`${URL_PREFIX}${k}`, { kind: "value", value: v, source }, BRIDGE_WRITER);
  }
  for (const entry of listStates()) {
    if (!entry.key.startsWith(URL_PREFIX)) continue;
    const param = entry.key.slice(URL_PREFIX.length);
    if (!seen.has(param) && entry.value) {
      // URL no longer carries this param; clear the state entry to match.
      setState(entry.key, { kind: "value", value: "", source }, BRIDGE_WRITER);
    }
  }
}

function syncStateToUrl(): void {
  if (typeof window === "undefined") return;
  const next = new URLSearchParams();
  for (const entry of listStates()) {
    if (!entry.key.startsWith(URL_PREFIX)) continue;
    const param = entry.key.slice(URL_PREFIX.length);
    if (typeof entry.value === "string" && entry.value.length > 0) {
      next.set(param, entry.value);
    }
  }
  const nextSearch = next.toString();
  const currentSearch = window.location.search.replace(/^\?/, "");
  if (nextSearch === currentSearch) return;
  const url =
    window.location.pathname + (nextSearch ? "?" + nextSearch : "") + window.location.hash;
  window.history.pushState({}, "", url);
}

/**
 * Mount the URL ↔ state bridge. Idempotent — repeated calls are a no-op
 * after the first. Returns a cleanup function (called from React effect).
 */
export function mountUrlQueryStateBridge(): () => void {
  if (typeof window === "undefined") return () => {};
  if (_mounted) return _detach || (() => {});
  _mounted = true;

  // Initial seed from the current URL.
  syncUrlToState("load");

  // popstate (back/forward) → re-seed from URL.
  const onPopState = () => syncUrlToState("runtime");
  window.addEventListener("popstate", onPopState);

  // Global state tick → push URL when any url:* key drifted from the bar.
  // The subscribe(globalListener) overload fires on every state write
  // (debounced inside the registry by value-equality), so this is cheap.
  const offGlobal = subscribe(() => syncStateToUrl());

  _detach = () => {
    window.removeEventListener("popstate", onPopState);
    offGlobal();
    _mounted = false;
    _detach = null;
  };
  return _detach;
}

/** Convenience reader for callers that prefer the explicit URL contract. */
export function getUrlState(param: string): string | undefined {
  const v = getStateValue(`${URL_PREFIX}${param}`);
  return v == null ? undefined : v;
}
