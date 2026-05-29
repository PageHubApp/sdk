/**
 * State registry — the single reactive state surface for the SDK.
 *
 * Replaces the bespoke `showHideStore` as one consumer among many. Every
 * stateful behavior (visibility, modal open/close, selection, derived flags)
 * writes and reads through this registry. Conditions, className composition,
 * and action gating all evaluate against the same store.
 *
 * Reactivity model — keyed subscriptions. A consumer that binds to key
 * `tab-group-1` does NOT rerender when `cart-open` changes. Performance for
 * a page with N independent stateful regions stays O(consumers of one key)
 * instead of O(all consumers).
 *
 * ESC stack lives here too: visibility writes maintain a LIFO stack of shown
 * targets; the document-level ESC listener pops the top unless the element
 * carries `data-close-on-escape="false"`.
 */

import { useSyncExternalStore } from "react";
import { sdkLog } from "../logger";

export type StateKind = "visibility" | "selection" | "flag" | "value";

export type WriterSource = "runtime" | "load" | "editor-preview" | "computed";

export interface StateEntry {
  /** Stable key — element id (implicit) or named state declared on ROOT. */
  key: string;
  /** Discriminator. Drives operator hints in the editor + sugar APIs. */
  kind: StateKind;
  /** Current value. Visibility uses "shown"|"hidden", flag "on"|"off", others freeform. */
  value: string | null;
  /** Origin of the last write — useful for the inspector and computed-skip on ESC. */
  source: WriterSource;
  /** Last writer label (node id, action label, "esc", "computed", "seed"). */
  lastWriter?: string;
}

type KeyListener = () => void;

const _entries = new Map<string, StateEntry>();
const _keyListeners = new Map<string, Set<KeyListener>>();
const _globalListeners = new Set<KeyListener>();

const _shownStack: string[] = [];
let _escInstalled = false;

let _globalTick = 0;

// Cached snapshot for `useAllStates`. Declared up here so `notify()` can
// invalidate it before the listener fan-out.
let _allStatesSnapshot: readonly StateEntry[] = [];
let _allStatesDirty = true;

// ─── Listener wiring ────────────────────────────────────────────────────────

function notify(key: string): void {
  _globalTick++;
  _allStatesDirty = true;
  const set = _keyListeners.get(key);
  if (set) {
    set.forEach(fn => {
      try {
        fn();
      } catch (e) {
        sdkLog.error("state listener error:", e);
      }
    });
  }
  _globalListeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      sdkLog.error("state listener error:", e);
    }
  });
}

// ─── ESC handler ────────────────────────────────────────────────────────────

function installEscHandler(): void {
  if (_escInstalled || typeof document === "undefined") return;
  _escInstalled = true;
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape" || _shownStack.length === 0) return;
    // Walk from the top down. Skip computed (regenerated) entries and
    // explicit opt-outs (`data-close-on-escape="false"`). The first eligible
    // entry is closed; entries below it are only revealed if every higher
    // entry was opted-out — so a stuck non-dismissable overlay can't trap
    // the visitor with no escape.
    for (let i = _shownStack.length - 1; i >= 0; i--) {
      const top = _shownStack[i];
      const entry = _entries.get(top);
      if (!entry) {
        _shownStack.splice(i, 1);
        continue;
      }
      if (entry.source === "computed") continue;
      const el = document.getElementById(top);
      if (el?.getAttribute("data-close-on-escape") === "false") continue;
      if (el) el.classList.add("hidden");
      setVisibility(top, "hidden", "esc");
      return;
    }
  });
}

// ─── Core API ───────────────────────────────────────────────────────────────

export function getState(key: string): StateEntry | undefined {
  return _entries.get(key);
}

export function getStateValue(key: string): string | null | undefined {
  return _entries.get(key)?.value;
}

export function setState(
  key: string,
  patch: Partial<Omit<StateEntry, "key">>,
  writer?: string
): void {
  if (!key) return;
  const prev = _entries.get(key);
  const next: StateEntry = {
    key,
    kind: patch.kind ?? prev?.kind ?? "value",
    value: patch.value !== undefined ? patch.value : (prev?.value ?? null),
    source: patch.source ?? prev?.source ?? "runtime",
    lastWriter: writer ?? patch.lastWriter ?? prev?.lastWriter,
  };
  if (prev && prev.value === next.value && prev.kind === next.kind && prev.source === next.source) {
    // No reactive change, but `lastWriter` is a debug attribution signal —
    // keep it fresh even on no-op writes. Don't notify (nothing observable
    // changed for subscribers).
    _entries.set(key, next);
    return;
  }
  _entries.set(key, next);

  // Maintain visibility ESC stack.
  if (next.kind === "visibility") {
    const idx = _shownStack.indexOf(key);
    if (next.value === "shown") {
      if (idx !== -1) _shownStack.splice(idx, 1);
      _shownStack.push(key);
      installEscHandler();
    } else if (idx !== -1) {
      _shownStack.splice(idx, 1);
    }
  }

  notify(key);
}

export function deleteState(key: string): void {
  if (!_entries.has(key)) return;
  _entries.delete(key);
  const idx = _shownStack.indexOf(key);
  if (idx !== -1) _shownStack.splice(idx, 1);
  notify(key);
}

export function listStates(): readonly StateEntry[] {
  return Array.from(_entries.values());
}

export function subscribe(
  fnOrKey: string | ((changed: string) => void),
  fn?: KeyListener
): () => void {
  // Two call shapes — `subscribe(globalListener)` or `subscribe(key, listener)`.
  if (typeof fnOrKey === "function") {
    const listener = fnOrKey as () => void;
    _globalListeners.add(listener);
    return () => _globalListeners.delete(listener);
  }
  const key = fnOrKey;
  const listener = fn!;
  let set = _keyListeners.get(key);
  if (!set) {
    set = new Set();
    _keyListeners.set(key, set);
  }
  set.add(listener);
  return () => {
    const s = _keyListeners.get(key);
    if (!s) return;
    s.delete(listener);
    if (s.size === 0) _keyListeners.delete(key);
  };
}

export function getGlobalTick(): number {
  return _globalTick;
}

// ─── Visibility sugar ───────────────────────────────────────────────────────

export function setVisibility(key: string, value: "shown" | "hidden", writer?: string): void {
  setState(key, { kind: "visibility", value, source: "runtime" }, writer);
}

export function getVisibility(key: string): "shown" | "hidden" | undefined {
  const v = getStateValue(key);
  return v === "shown" || v === "hidden" ? v : undefined;
}

export function toggleVisibility(key: string, writer?: string): void {
  const current = getVisibility(key);
  setVisibility(key, current === "shown" ? "hidden" : "shown", writer);
}

// ─── React hooks ────────────────────────────────────────────────────────────

export function useStateEntry(key: string | undefined): StateEntry | undefined {
  // Same getSnapshot for client + server — registry is module-level so the
  // server-rendered tree only sees seeded entries (none, until
  // `seedFromWindow()` runs). Returning the same value from both paths
  // avoids hydration tearing warnings.
  const getSnapshot = () => (key ? _entries.get(key) : undefined);
  return useSyncExternalStore(
    cb => {
      if (!key) return () => {};
      return subscribe(key, cb);
    },
    getSnapshot,
    getSnapshot
  );
}

export function useStateValue(key: string | undefined): string | null | undefined {
  const entry = useStateEntry(key);
  return entry?.value;
}

// `useSyncExternalStore` requires referential stability for `getSnapshot`
// between successive calls when nothing changed; the snapshot/dirty pair
// declared at module top is invalidated by `notify()`.
function getAllStatesSnapshot(): readonly StateEntry[] {
  if (_allStatesDirty) {
    _allStatesSnapshot = Array.from(_entries.values());
    _allStatesDirty = false;
  }
  return _allStatesSnapshot;
}

export function useAllStates(): readonly StateEntry[] {
  return useSyncExternalStore(
    cb => {
      _globalListeners.add(cb);
      return () => _globalListeners.delete(cb);
    },
    getAllStatesSnapshot,
    getAllStatesSnapshot
  );
}

/**
 * Single global "any state changed" tick for consumers that want coarse
 * subscription. Prefer `useStateValue(key)` whenever a specific key is
 * known — it narrows the rerender blast radius.
 */
export function useGlobalStateTick(): number {
  return useSyncExternalStore(
    cb => {
      _globalListeners.add(cb);
      return () => _globalListeners.delete(cb);
    },
    () => _globalTick,
    () => _globalTick
  );
}

// ─── Pre-hydration seed (`window.__PH_STATE__`) ─────────────────────────────

declare global {
  interface Window {
    __PH_STATE__?: Record<string, { kind?: StateKind; value: string | null }>;
  }
}

// Track which `__PH_STATE__` reference we've already consumed so idempotent
// re-calls within one page don't re-write entries on every mount, but a
// route swap that mutates `window.__PH_STATE__` (editor preview switching
// between sites, SPA navigation that re-renders the bootstrap script) does
// re-seed.
let _lastSeededRef: object | null | undefined = undefined;

/**
 * Seed the registry from `window.__PH_STATE__`. Idempotent on repeat calls
 * with the same reference; re-runs when the window slot is replaced.
 * Static export's load-action bootstrap script (`getLoadActionScript()`)
 * writes the seed pre-hydration; React reads it once on first mount via
 * `useViewerSetup`.
 */
export function seedFromWindow(): void {
  if (typeof window === "undefined") return;
  const seed = window.__PH_STATE__;
  if (!seed) {
    _lastSeededRef = null;
    return;
  }
  if (_lastSeededRef === seed) return;
  _lastSeededRef = seed;
  for (const [key, raw] of Object.entries(seed)) {
    if (!key) continue;
    setState(
      key,
      {
        kind: (raw.kind ?? "value") as StateKind,
        value: raw.value,
        source: "load",
      },
      "seed"
    );
  }
}

/** Reset for tests. Not exported via the public surface. */
export function __resetForTests(): void {
  _entries.clear();
  _keyListeners.clear();
  _globalListeners.clear();
  _shownStack.length = 0;
  _globalTick = 0;
  _lastSeededRef = undefined;
  _allStatesDirty = true;
}

// ─── ClassName override (compat with showHideStore.applyShowHideOverride) ──

/**
 * Apply the registry's visibility override to a className string. `shown`
 * strips `hidden`; `hidden` adds it; unknown keys leave the className alone.
 * Exists so render-path code (Container) can stay one-liner.
 */
export function applyVisibilityOverride(className: string, target: string | undefined): string {
  if (!target) return className;
  const v = getVisibility(target);
  if (v === undefined) return className;
  const tokens = (className || "").split(/\s+/).filter(Boolean);
  const hasHidden = tokens.includes("hidden");
  if (v === "shown" && hasHidden) return tokens.filter(t => t !== "hidden").join(" ");
  if (v === "hidden" && !hasHidden) return [...tokens, "hidden"].join(" ");
  return className;
}
