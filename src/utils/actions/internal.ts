/**
 * Internal helpers shared across action handlers — DOM visibility, item
 * interpolation, hover-revert scratch, and the `chain` event composer.
 */
import type { NodeAction, ShowHideAction } from "../action";
import { getState, setVisibility } from "../state/stateRegistry";

// ─── Visibility helpers ────────────────────────────────────────────────

export function showElement(el: HTMLElement, method: "class" | "style" = "class") {
  if (method === "style") {
    el.style.display = "block";
    return;
  }
  // Mutate the live DOM for an instant response (before React rerenders),
  // and write to the store so the next React render produces a className
  // without `hidden` (otherwise reconciliation would re-add it from props).
  el.classList.remove("hidden");
  if (el.id) setVisibility(el.id, "shown");
}

export function hideElement(el: HTMLElement, method: "class" | "style" = "class") {
  if (method === "style") {
    el.style.display = "none";
    return;
  }
  el.classList.add("hidden");
  if (el.id) setVisibility(el.id, "hidden");
}

export function toggleElement(el: HTMLElement, method: "class" | "style" = "class") {
  if (method === "style") {
    el.style.display = el.style.display === "none" ? "block" : "none";
    return;
  }
  const willHide = !el.classList.contains("hidden");
  el.classList.toggle("hidden");
  if (el.id) setVisibility(el.id, willHide ? "hidden" : "shown");
}

// ─── Show/Hide + Tab logic ─────────────────────────────────────────────

export function applyShowHide(action: ShowHideAction, _e?: any) {
  const el = document.getElementById(action.target);
  if (!el) return;

  const method = action.method || "class";

  if (action.direction === "tab") {
    // Mutual-exclusion swap among siblings sharing the same `tabGroup`.
    // Pure panel visibility — no implicit state writes, no sibling-walk on
    // tab buttons. Authors who want active styling on the trigger compose
    // a `set-state` action alongside (and read it via `stateModifiers` /
    // `state` conditions). See docs/sdk/state-system.md.
    const group = action.group || action.target;
    document
      .querySelectorAll(`[data-tab-group="${group}"]`)
      .forEach(panel => hideElement(panel as HTMLElement, method));
    showElement(el, method);
  } else if (action.direction === "show") {
    showElement(el, method);
  } else if (action.direction === "hide") {
    hideElement(el, method);
  } else {
    toggleElement(el, method);
  }
}

export function revertShowHide(action: ShowHideAction) {
  const el = document.getElementById(action.target);
  if (!el) return;

  const method = action.method || "class";
  if (action.direction === "show") hideElement(el, method);
  else if (action.direction === "hide") showElement(el, method);
  // toggle: no revert on hover leave
}

// ─── Hover-revert state, keyed by action identity ────────────────────
//
// React re-renders rebuild the closure each time `addActionHandlers` runs,
// so closure-local `didSet`/`prevValue` flags are LOST between a hover
// `enter` and the corresponding `leave` if a state-driven re-render happens
// in between. The `action` object reference stays stable across renders
// (CraftJS preserves prop identity for unchanged props), so we key the
// hover scratch state on the action itself via WeakMap. GC follows action
// disposal automatically.

export interface HoverScratch {
  didSet: boolean;
  prevValue: string | null | undefined;
  resolvedKey: string | undefined;
  prevEntry?: ReturnType<typeof getState>;
}
const _hoverScratch = new WeakMap<object, HoverScratch>();

export function hoverState(action: NodeAction): HoverScratch {
  let s = _hoverScratch.get(action as unknown as object);
  if (!s) {
    s = { didSet: false, prevValue: undefined, resolvedKey: undefined };
    _hoverScratch.set(action as unknown as object, s);
  }
  return s;
}

// ─── Item interpolation (set-state / toggle-state values) ─────────────

/**
 * Resolve `{{item.path.to.value}}` against a repeater item context. Minimal
 * by design — handles dot-paths and array-by-index. Mirrors `walkPath` in
 * `conditions/evaluate.ts`. We don't reach for `replaceVariables` here
 * because it requires a CraftJS query the action runtime doesn't have.
 */
function walkItem(obj: any, parts: string[]): any {
  let value: any = obj;
  for (const part of parts) {
    if (value == null || typeof value !== "object") return undefined;
    if (Array.isArray(value) && /^\d+$/.test(part)) {
      value = value[parseInt(part, 10)];
    } else if (part in value) {
      value = value[part];
    } else {
      return undefined;
    }
  }
  return value;
}

export function interpolateItem(
  raw: string | undefined | null,
  item: Record<string, any> | null | undefined
): string {
  if (raw == null) return "";
  if (typeof raw !== "string" || !item) return String(raw);
  return raw.replace(/\{\{\s*item\.([\w.[\]]+)\s*\}\}/g, (_, path) => {
    const cleaned = path.replace(/\[(\d+)\]/g, ".$1");
    const v = walkItem(item, cleaned.split("."));
    return v == null ? "" : String(v);
  });
}

/**
 * Resolve a state-action `key` (set/toggle/clear/increment/decrement-state +
 * variantMatchStateKey + agent-send field) against the current item context.
 * Returns `""` when interp leaves un-interpolated `{{item.X}}` tokens —
 * matches the variant-match guard in `computedState.ts`. Action handlers
 * treat `""` as a no-op so writes to junk keys are silently dropped instead
 * of polluting the registry with literal-template strings.
 */
export function resolveActionKey(
  raw: string | undefined | null,
  item: Record<string, any> | null | undefined
): string {
  if (!raw) return "";
  const out = interpolateItem(raw, item);
  if (/\{\{\s*item\./i.test(out)) return "";
  return out || raw;
}

// ─── Event composition ─────────────────────────────────────────────────

/**
 * Compose a new event handler onto `prop[key]`. The new handler receives
 * `(event, runPrevious)` — call `runPrevious(event)` to fire the prior
 * handler in chain order. Kept inline-friendly so each action branch reads
 * top-to-bottom: prior chain → new behavior.
 */
export function chain(
  prop: any,
  key: "onClick" | "onMouseEnter" | "onMouseLeave",
  body: (event: any, runPrevious: (event: any) => void) => void | Promise<void>
): void {
  const existing = prop[key];
  prop[key] = (event: any) => {
    const runPrevious = (e: any) => {
      if (typeof existing === "function") existing(e);
    };
    body(event, runPrevious);
  };
}

// ─── Shared action context type ────────────────────────────────────────

export type ActionContext = {
  itemContext?: Record<string, any> | null;
  onAddToCart?: (item: Record<string, any>, qty: number) => void;
  /**
   * Resolved external/internal href for `link` actions in the array.
   * Caller (Button/Link/Container/Text/Image) computes this once via
   * `actionToHref` + `replaceVariables` + `resolvePageRef`. Kept on the
   * context so each link action in the chain navigates to the same place
   * the visible `<a href>` points at, including ref-resolution / item
   * interpolation that this helper has no access to.
   */
  resolvedLinkHref?: string | null;
};
