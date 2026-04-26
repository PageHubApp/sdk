/**
 * Reactive show-hide store.
 *
 * Show-hide actions with `method: "class"` previously only mutated DOM via
 * `classList.remove("hidden")`. React's next render rewrote `className` from
 * props (which still contained `hidden`), instantly undoing the toggle. The
 * old workaround was Button forcing `method: "style"` so inline styles —
 * which React doesn't manage on these elements — would survive rerenders.
 *
 * This store is the source of truth for class-based show-hide state. Show-hide
 * writes here; targeted Containers subscribe via useSyncExternalStore and
 * compute their className accordingly. React rerenders now produce the right
 * className, no DOM clobber.
 */

type State = "shown" | "hidden";

let _state: Record<string, State> = {};
let _version = 0;
const _listeners = new Set<() => void>();

// Stack of currently-shown targets, most recent last. ESC pops the top.
const _shownStack: string[] = [];
let _escInstalled = false;

export function setShowHideState(target: string, state: State): void {
  if (!target) return;
  if (_state[target] === state) return;
  _state = { ..._state, [target]: state };
  _version++;
  // Maintain the shown-stack for ESC.
  const idx = _shownStack.indexOf(target);
  if (state === "shown") {
    if (idx !== -1) _shownStack.splice(idx, 1);
    _shownStack.push(target);
    installEscHandler();
  } else if (idx !== -1) {
    _shownStack.splice(idx, 1);
  }
  _listeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      console.error("show-hide listener error:", e);
    }
  });
}

/**
 * Install a single document-level ESC listener on first class-based show.
 * On ESC, hide the most-recently-shown target unless it opted out via
 * `data-close-on-escape="false"`. Module-level — installs once per page.
 */
function installEscHandler(): void {
  if (_escInstalled || typeof document === "undefined") return;
  _escInstalled = true;
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape" || _shownStack.length === 0) return;
    const top = _shownStack[_shownStack.length - 1];
    const el = document.getElementById(top);
    if (!el) {
      _shownStack.pop();
      return;
    }
    if (el.getAttribute("data-close-on-escape") === "false") return;
    el.classList.add("hidden");
    setShowHideState(top, "hidden");
  });
}

export function toggleShowHideState(target: string): void {
  if (!target) return;
  const current = _state[target];
  // If unknown, flip from "shown" → assume initial className says hidden, so toggle to shown.
  setShowHideState(target, current === "shown" ? "hidden" : "shown");
}

export function getShowHideState(target: string): State | undefined {
  return _state[target];
}

export function getShowHideVersion(): number {
  return _version;
}

export function subscribeShowHide(fn: () => void): () => void {
  _listeners.add(fn);
  return () => {
    _listeners.delete(fn);
  };
}

import { useSyncExternalStore } from "react";

/**
 * Subscribe a component to show-hide state changes. Returns the version number;
 * consumers don't usually read it — calling the hook is enough to rerender on
 * every store update.
 */
export function useShowHideVersion(): number {
  return useSyncExternalStore(subscribeShowHide, getShowHideVersion, getShowHideVersion);
}

/**
 * Apply the store's override to a className string for a given target.
 * - "shown" → strip `hidden` token.
 * - "hidden" → ensure `hidden` token is present.
 * - undefined → return as-is (initial render uses author's className).
 */
export function applyShowHideOverride(className: string, target: string | undefined): string {
  if (!target) return className;
  const state = _state[target];
  if (state === undefined) return className;
  const tokens = (className || "").split(/\s+/).filter(Boolean);
  const hasHidden = tokens.includes("hidden");
  if (state === "shown" && hasHidden) {
    return tokens.filter(t => t !== "hidden").join(" ");
  }
  if (state === "hidden" && !hasHidden) {
    return [...tokens, "hidden"].join(" ");
  }
  return className;
}
