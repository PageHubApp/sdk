/**
 * Runtime action handlers — attaches event listeners to component prop objects
 * based on the unified NodeAction system.
 */
import type {
  AddToCartAction,
  ClearStateAction,
  NodeAction,
  SetStateAction,
  ShowHideAction,
  ToggleStateAction,
  ToggleThemeAction,
} from "./action";
import { phStorage } from "./phStorage";
import {
  deleteState,
  getState,
  getStateValue,
  setState,
  setVisibility,
} from "./stateRegistry";
import { evaluateConditionGroups } from "./conditions/evaluate";
import { buildConditionEvalFns } from "./conditions/clientScript";
import type { ConditionContext } from "./conditions/types";
import { getAuthState } from "./design/variables";

// ─── Legacy type (kept for migration period only) ──────────────────────
export interface ClickControl {
  type: "click" | "hover";
  direction: "show" | "hide" | "toggle" | "tab";
  value: string;
  method?: "class" | "style";
  group?: string;
}

// ─── Visibility helpers ────────────────────────────────────────────────

function showElement(el: HTMLElement, method: "class" | "style" = "class") {
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

function hideElement(el: HTMLElement, method: "class" | "style" = "class") {
  if (method === "style") {
    el.style.display = "none";
    return;
  }
  el.classList.add("hidden");
  if (el.id) setVisibility(el.id, "hidden");
}

function toggleElement(el: HTMLElement, method: "class" | "style" = "class") {
  if (method === "style") {
    el.style.display = el.style.display === "none" ? "block" : "none";
    return;
  }
  const willHide = !el.classList.contains("hidden");
  el.classList.toggle("hidden");
  if (el.id) setVisibility(el.id, willHide ? "hidden" : "shown");
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

function interpolateItem(
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

// ─── Show/Hide + Tab logic ─────────────────────────────────────────────

function applyShowHide(action: ShowHideAction, e?: any) {
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

function revertShowHide(action: ShowHideAction) {
  const el = document.getElementById(action.target);
  if (!el) return;

  const method = action.method || "class";
  if (action.direction === "show") hideElement(el, method);
  else if (action.direction === "hide") showElement(el, method);
  // toggle: no revert on hover leave
}

// ─── Public API ────────────────────────────────────────────────────────

type ActionContext = {
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

/**
 * Attach runtime event handlers for an array of actions. Every branch
 * COMPOSES onto any handler already on `prop` (existing handler runs
 * first, new behavior second) — no overwrites. Multi-action chains fire
 * in array order on a single click.
 *
 * Anchor links and `link` actions are dispatched here too: anchor → smooth
 * scroll, link → `e.preventDefault()` + `window.location.assign(href)` /
 * `window.open(href, target)`. Callers that have a single non-anchor `link`
 * action should skip this function and let the `<a href>` navigate
 * natively (faster, no JS hop) — see Button.tsx for the policy.
 */
export function addActionHandlers(
  prop: any,
  actions: NodeAction[] | NodeAction | null | undefined,
  enabled: boolean,
  context?: ActionContext
) {
  const list: NodeAction[] = Array.isArray(actions) ? actions : actions ? [actions] : [];
  if (list.length === 0) return;

  for (const action of list) {
    attachOne(prop, action, enabled, context);
  }
}

/** Compose one action's handlers onto `prop`. Never overwrites existing handlers. */
function attachOne(
  prop: any,
  action: NodeAction,
  enabled: boolean,
  context?: ActionContext
) {
  // Anchor link — `scroll-to` or unified `link` with `href: "#…"`.
  const anchor =
    action.type === "scroll-to"
      ? action.anchor
      : action.type === "link" && typeof action.href === "string" && action.href.startsWith("#")
        ? action.href.slice(1)
        : null;
  if (anchor) {
    chain(prop, "onClick", (e, run) => {
      run(e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      e.preventDefault();
      const el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return;
  }

  // Link (non-anchor) — programmatic navigation. Caller passes the resolved
  // href on `context.resolvedLinkHref` so ref:/page interpolation is honored.
  if (action.type === "link") {
    chain(prop, "onClick", (e, run) => {
      run(e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      const href = context?.resolvedLinkHref || action.href;
      if (!href) return;
      e.preventDefault();
      if (action.target === "_blank") {
        window.open(href, "_blank", "noopener,noreferrer");
      } else {
        window.location.assign(href);
      }
    });
    return;
  }

  if (action.type === "open-modal") {
    chain(prop, "onClick", (e, run) => {
      run(e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      e.preventDefault();
      // Modal preset is plain Container + show-hide — route through the
      // registry's visibility primitives. `data-modal` legacy attribute is
      // ignored (was dead code; saw the audit).
      const el = document.getElementById(action.anchor);
      if (el) toggleElement(el, "class");
    });
    return;
  }

  if (action.type === "toggle-theme") {
    chain(prop, "onClick", (e, run) => {
      run(e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      e.preventDefault();
      const ta = action as ToggleThemeAction;
      const next = !document.documentElement.classList.contains("dark");
      document.documentElement.classList.add("theme-transition");
      if (next) {
        document.documentElement.classList.add("dark");
        phStorage.set("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        phStorage.set("theme", "light");
      }
      requestAnimationFrame(() => {
        document.documentElement.classList.remove("theme-transition");
      });
      if (ta.dismissTarget) {
        const el = document.getElementById(ta.dismissTarget);
        if (el) hideElement(el as HTMLElement, ta.dismissMethod || "style");
      }
    });
    return;
  }

  if (action.type === "add-to-cart") {
    chain(prop, "onClick", (e, run) => {
      run(e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      e.preventDefault();
      const item = context?.itemContext;
      if (!item) {
        console.warn(
          "[PageHub] add-to-cart action requires a data-bound Container parent. Place this button inside a Container with a dataSource."
        );
        return;
      }
      const cartAction = action as AddToCartAction;
      let qty = cartAction.quantity || 1;
      if (cartAction.quantityField) {
        const btn = e.currentTarget as HTMLElement | null;
        const scope = btn?.closest("form, [data-storefront-root], section, body");
        const field = scope?.querySelector(
          `[name="${cartAction.quantityField}"]`
        ) as HTMLInputElement | null;
        const parsed = field ? Number(field.value) : NaN;
        if (Number.isFinite(parsed) && parsed > 0) qty = Math.floor(parsed);
      }
      context?.onAddToCart?.(item, qty);
      document.dispatchEvent(
        new CustomEvent("pagehub:add-to-cart", { detail: { item, quantity: qty } })
      );
    });
    return;
  }

  if (action.type === "toggle-cart") {
    chain(prop, "onClick", (e, run) => {
      run(e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("pagehub:toggle-cart"));
    });
    return;
  }

  if (action.type === "cart-checkout") {
    chain(prop, "onClick", (e, run) => {
      run(e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("pagehub:cart-checkout"));
    });
    return;
  }

  if (action.type === "agent-send") {
    chain(prop, "onClick", (e, run) => {
      run(e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      e.preventDefault();
      const btn = e.currentTarget as HTMLElement | null;
      const root = btn?.closest("[data-ph-agent-chat]") as HTMLElement | null;
      if (!root) return;
      const fieldName = (action as any).field || "agentMessage";
      const field = root.querySelector(
        `[name="${fieldName}"]`
      ) as HTMLInputElement | HTMLTextAreaElement | null;
      const value = (field?.value || "").trim();
      if (!value) return;
      root.dispatchEvent(
        new CustomEvent("pagehub:agent-send", {
          detail: { value, field: fieldName },
          bubbles: false,
        })
      );
      if (field) {
        field.value = "";
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.focus();
      }
    });
    return;
  }

  if (action.type === "set-local-storage") {
    const sls = action as { type: "set-local-storage"; key: string; value: string };
    chain(prop, "onClick", (e, run) => {
      run(e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      try {
        if (sls.key) window.localStorage.setItem(sls.key, sls.value ?? "");
      } catch (err) {
        console.warn("[PageHub] set-local-storage failed", err);
      }
    });
    return;
  }

  if (action.type === "remove-local-storage") {
    const rls = action as { type: "remove-local-storage"; key: string };
    chain(prop, "onClick", (e, run) => {
      run(e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      try {
        if (rls.key) window.localStorage.removeItem(rls.key);
      } catch (err) {
        console.warn("[PageHub] remove-local-storage failed", err);
      }
    });
    return;
  }

  if (action.type === "manage-subscription") {
    chain(prop, "onClick", async (e, run) => {
      run(e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      e.preventDefault();
      try {
        const res = await fetch("/api/customer/portal", {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      } catch {
        /* silently fail */
      }
    });
    return;
  }

  // State actions (set/toggle/clear) fire in BOTH editor and viewer modes —
  // active styling on tab buttons, selection chips, drawer triggers etc. is
  // presentation-only (no destructive state, no nav, no submit). Treating
  // editor mode as "no state writes" leaves authors with stale active
  // indicators after every preview click. Skip only the visitor condition
  // gate in editor mode, mirroring the show-hide tab-direction policy.
  if (action.type === "set-state") {
    const ss = action as SetStateAction;
    const isHover = (ss.trigger || "click") === "hover";
    const enter = (e: any, run: any) => {
      run(e);
      if (!enabled && !actionGatePasses(action)) return;
      if (!ss.key) return;
      const v = interpolateItem(ss.value, context?.itemContext);
      setState(
        ss.key,
        { kind: ss.kind ?? "value", value: v, source: enabled ? "editor-preview" : "runtime" },
        "set-state"
      );
    };
    if (isHover) {
      // Hover-restore captures prior value per closure so onMouseLeave
      // returns the registry to its pre-hover state. Click triggers don't
      // restore — they're intentionally sticky.
      let didSet = false;
      let prevValue: string | null | undefined;
      const hoverEnter = (e: any, run: any) => {
        run(e);
        if (!enabled && !actionGatePasses(action)) return;
        if (!ss.key) return;
        prevValue = getStateValue(ss.key);
        const v = interpolateItem(ss.value, context?.itemContext);
        setState(
          ss.key,
          { kind: ss.kind ?? "value", value: v, source: enabled ? "editor-preview" : "runtime" },
          "set-state"
        );
        didSet = true;
      };
      const hoverLeave = (e: any, run: any) => {
        run(e);
        if (!didSet) return;
        didSet = false;
        if (!ss.key) return;
        if (prevValue === undefined) {
          deleteState(ss.key);
        } else {
          setState(
            ss.key,
            { kind: ss.kind ?? "value", value: prevValue, source: enabled ? "editor-preview" : "runtime" },
            "set-state"
          );
        }
      };
      chain(prop, "onMouseEnter", hoverEnter);
      chain(prop, "onMouseLeave", hoverLeave);
    } else {
      chain(prop, "onClick", enter);
    }
    return;
  }

  if (action.type === "toggle-state") {
    const ts = action as ToggleStateAction;
    const isHover = (ts.trigger || "click") === "hover";
    const resolvePair = (kind: string): [string, string] | null => {
      if (ts.values) return ts.values;
      if (kind === "visibility") return ["shown", "hidden"];
      if (kind === "flag") return ["on", "off"];
      console.warn(
        `[PageHub] toggle-state on key "${ts.key}" (kind: ${kind}) needs explicit values. Skipping.`
      );
      return null;
    };
    const writeFlip = (): void => {
      if (!ts.key) return;
      const current = getStateValue(ts.key);
      const kind = ts.kind ?? getState(ts.key)?.kind ?? "flag";
      const pair = resolvePair(kind);
      if (!pair) return;
      const next = current === pair[0] ? pair[1] : pair[0];
      setState(
        ts.key,
        { kind, value: next, source: enabled ? "editor-preview" : "runtime" },
        "toggle-state"
      );
    };
    if (isHover) {
      let didSet = false;
      let prevValue: string | null | undefined;
      const hoverEnter = (e: any, run: any) => {
        run(e);
        if (!enabled && !actionGatePasses(action)) return;
        if (!ts.key) return;
        prevValue = getStateValue(ts.key);
        writeFlip();
        didSet = true;
      };
      const hoverLeave = (e: any, run: any) => {
        run(e);
        if (!didSet) return;
        didSet = false;
        if (!ts.key) return;
        const kind = ts.kind ?? getState(ts.key)?.kind ?? "flag";
        if (prevValue === undefined) {
          deleteState(ts.key);
        } else {
          setState(
            ts.key,
            { kind, value: prevValue, source: enabled ? "editor-preview" : "runtime" },
            "toggle-state"
          );
        }
      };
      chain(prop, "onMouseEnter", hoverEnter);
      chain(prop, "onMouseLeave", hoverLeave);
    } else {
      chain(prop, "onClick", (e, run) => {
        run(e);
        if (!enabled && !actionGatePasses(action)) return;
        writeFlip();
      });
    }
    return;
  }

  if (action.type === "clear-state") {
    const cs = action as ClearStateAction;
    const isHover = (cs.trigger || "click") === "hover";
    if (isHover) {
      let didDelete = false;
      let prev: ReturnType<typeof getState>;
      const hoverEnter = (e: any, run: any) => {
        run(e);
        if (!enabled && !actionGatePasses(action)) return;
        if (!cs.key) return;
        prev = getState(cs.key);
        deleteState(cs.key);
        didDelete = true;
      };
      const hoverLeave = (e: any, run: any) => {
        run(e);
        if (!didDelete) return;
        didDelete = false;
        if (!cs.key || !prev) return;
        setState(
          cs.key,
          { kind: prev.kind, value: prev.value, source: prev.source },
          "clear-state"
        );
      };
      chain(prop, "onMouseEnter", hoverEnter);
      chain(prop, "onMouseLeave", hoverLeave);
    } else {
      chain(prop, "onClick", (e, run) => {
        run(e);
        if (!enabled && !actionGatePasses(action)) return;
        if (!cs.key) return;
        deleteState(cs.key);
      });
    }
    return;
  }

  if (action.type !== "show-hide") return;
  if (!action.target) return;

  const trigger = action.trigger || "click";

  if (trigger === "hover") {
    chain(prop, "onMouseEnter", (_e, run) => {
      run(_e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      applyShowHide(action);
    });
    chain(prop, "onMouseLeave", (_e, run) => {
      run(_e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      revertShowHide(action);
    });
  }

  if (trigger === "click") {
    chain(prop, "onClick", (e, run) => {
      run(e);
      // Tab switching is presentation-only (no destructive state) — let it
      // run in editor mode so authors can preview/edit non-default panels
      // by clicking the tab button. All other show-hide directions stay
      // gated so a stray "hide nav" click can't disrupt editing.
      if (enabled && action.direction !== "tab") return;
      // Skip condition gating in editor mode — preview clicks shouldn't
      // depend on visitor state (auth/url-param/etc.) to demonstrate behavior.
      if (!enabled && !actionGatePasses(action)) return;
      applyShowHide(action, e);
    });
  }
}

/**
 * Compose a new event handler onto `prop[key]`. The new handler receives
 * `(event, runPrevious)` — call `runPrevious(event)` to fire the prior
 * handler in chain order. Kept inline-friendly so each action branch reads
 * top-to-bottom: prior chain → new behavior.
 */
function chain(
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

// ─── Custom JS handlers (props.handlers) ──────────────────────────────

const handlerCache = new Map<string, (event: any) => void>();

function compileHandler(code: string): ((event: any) => void) | null {
  let fn = handlerCache.get(code);
  if (fn) return fn;
  try {
    fn = new Function("event", code) as (event: any) => void;
  } catch (err) {
    console.warn("[PageHub] invalid handler", err);
    return null;
  }
  handlerCache.set(code, fn);
  return fn;
}

/**
 * Attach author-defined JS event handlers declared on `props.handlers`.
 * Keys must look like React event props (`onClick`, `onMouseEnter`, ...);
 * values are code strings evaluated as function bodies with `event` in scope.
 *
 * Composes with any handler already on `prop` — existing action runs first,
 * custom handler second, both receive the same event. Skipped entirely in
 * editor mode so every keystroke in the handler code editor doesn't compile
 * a new function and pollute the cache.
 */
export function addCustomHandlers(
  prop: Record<string, any>,
  handlers: unknown,
  enabled: boolean
): void {
  if (enabled) return;
  if (!handlers || typeof handlers !== "object") return;
  for (const [eventName, code] of Object.entries(handlers as Record<string, unknown>)) {
    if (typeof code !== "string" || !code.trim()) continue;
    if (!/^on[A-Z]/.test(eventName)) continue;
    const compiled = compileHandler(code);
    if (!compiled) continue;

    const existing = prop[eventName];
    prop[eventName] = (event: any) => {
      if (typeof existing === "function") existing(event);
      try {
        compiled(event);
      } catch (err) {
        console.warn("[PageHub] handler runtime error", err);
      }
    };
  }
}

/**
 * Legacy wrapper — forwards old ClickControl to new system.
 * Used during migration period; remove once all call sites are updated.
 */
export function addClickControls(
  prop: any,
  click: ClickControl | undefined,
  enabled: boolean,
  _existingOnClick?: (e: any) => void
) {
  if (!click?.type || !click?.value) return;

  const action: ShowHideAction = {
    type: "show-hide",
    target: click.value,
    direction: click.direction || "toggle",
    method: click.method,
    group: click.group,
    trigger: click.type,
  };
  addActionHandlers(prop, [action], enabled);
}

/**
 * Static-export bootstrap for load-trigger actions. Static HTML has no React
 * → no `useEffect` → `Container` can't dispatch its own load actions on
 * mount. Container's `toHTML` stamps every load-trigger target with:
 *   - `data-ph-load-show=""` (presence marker)
 *   - `data-ph-load-method="class|style"`
 *   - `data-ph-load-conditions="<json>"` (optional gate)
 *   - `data-ph-load-set-state="<json[]>"` for state seeds
 *
 * Condition evaluator function definitions are shared with
 * `getConditionEvalScript` via `buildConditionEvalFns` so the two scripts
 * agree on which condition types are honored and how indeterminate values
 * are handled.
 *
 * In-app SSR routes (`/view`, `/static`, custom domains) hydrate React, so
 * `Container`'s mount effect fires `fireLoadAction` and this script is
 * unnecessary. Kept exclusive to static export to avoid double dispatch.
 */
export function getLoadActionScript({ mobileBreakpoint = 768 }: { mobileBreakpoint?: number } = {}): string {
  return `<script>
(function(){
  window.__PH_STATE__ = window.__PH_STATE__ || {};
  function seedSetState(){
    try {
      document.querySelectorAll('[data-ph-load-set-state]').forEach(function(el){
        var raw = el.getAttribute('data-ph-load-set-state');
        if (!raw) return;
        try {
          var arr = JSON.parse(raw);
          for (var i = 0; i < arr.length; i++) {
            var s = arr[i];
            if (s && s.key) {
              window.__PH_STATE__[s.key] = { kind: s.kind || 'value', value: s.value == null ? null : String(s.value) };
            }
          }
        } catch (e) {}
      });
    } catch (e) {}
  }
  seedSetState();
${buildConditionEvalFns({ mobileBreakpoint })}
  function run() {
    try {
      document.querySelectorAll('[data-ph-load-show]').forEach(function(el) {
        var raw = el.getAttribute('data-ph-load-conditions');
        if (raw) { try { if (!evalGroups(JSON.parse(raw))) return; } catch (e) {} }
        var m = el.getAttribute('data-ph-load-method') || 'class';
        if (m === 'style') el.style.display = 'block';
        else el.classList.remove('hidden');
        if (el.id) window.__PH_STATE__[el.id] = { kind: 'visibility', value: 'shown' };
      });
      seedSetState();
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
</script>`;
}

/**
 * @deprecated Use `getLoadActionScript()` instead — defaults to
 * mobileBreakpoint=768 (Tailwind `md`). Pre-existing constant kept so external
 * SDK consumers don't break; first-party callers should pass the per-site
 * breakpoint via the function form.
 */
export const PH_LOAD_ACTION_SCRIPT = getLoadActionScript();

/**
 * Build a viewer-side `ConditionContext` for action gating. Mirrors the
 * shape `withConditionalVisibility` constructs for node visibility but is
 * scoped to "right now, on this page" — no item context (load actions
 * don't fire inside repeaters), no connector data (load actions can't
 * wait on async fetches), no form fields. Auth + URL params + viewport
 * width cover the realistic gates: "logged-out only", "?ref=email",
 * "mobile only".
 */
/**
 * Evaluate `action.conditions` (if any) and return whether the action is
 * allowed to fire right now. Generalizes the gate that `fireLoadAction` has
 * always had — every action branch in `attachOne` calls this so click /
 * hover / load actions all honor the same condition shape.
 *
 * `null` (indeterminate) is treated as a pass — graceful degrade to "fire"
 * matches how load-trigger banners already work.
 */
export function actionGatePasses(action: NodeAction): boolean {
  const groups = action.conditions;
  if (!groups || groups.length === 0) return true;
  const ctx = buildLoadActionContext();
  return evaluateConditionGroups(groups, ctx) !== false;
}

function buildLoadActionContext(): ConditionContext {
  if (typeof window === "undefined") {
    return {
      urlParams: null,
      formFields: null,
      connectorData: null,
      company: null,
      viewportWidth: null,
      auth: null,
      item: null,
    };
  }
  return {
    urlParams: new URLSearchParams(window.location.search),
    formFields: null,
    connectorData: null,
    company: null,
    viewportWidth: window.innerWidth,
    auth: getAuthState(),
    item: null,
  };
}

/**
 * Fire a single load-trigger action on mount (viewer mode only). Evaluates
 * `action.conditions` first — skips firing when ANY group evaluates `false`.
 * Returns `null` (indeterminate, e.g. SSR with no localStorage) → fires
 * (matches the "graceful degrade to show" pattern visitors see when
 * localStorage is blocked).
 *
 * Handles `show-hide` (panel reveal), `set-state` (registry seed), and
 * `toggle-state` / `clear-state`. All routes through the registry so React
 * rerenders pick up the change without className clobber.
 *
 * Caller (Container) is responsible for skipping editor mode and only
 * passing `trigger: "load"` actions; this helper trusts its inputs.
 */
export function fireLoadAction(action: NodeAction): void {
  if ((action as any).trigger !== "load") return;
  if (!actionGatePasses(action)) return;
  if (action.type === "show-hide") {
    applyShowHide(action);
    return;
  }
  if (action.type === "set-state") {
    const ss = action as SetStateAction;
    if (!ss.key) return;
    setState(
      ss.key,
      { kind: ss.kind ?? "value", value: ss.value, source: "load" },
      "load"
    );
    return;
  }
  if (action.type === "toggle-state") {
    const ts = action as ToggleStateAction;
    if (!ts.key) return;
    const current = getStateValue(ts.key);
    const kind = ts.kind ?? getState(ts.key)?.kind ?? "flag";
    let pair: [string, string] | null = ts.values ?? null;
    if (!pair) {
      if (kind === "visibility") pair = ["shown", "hidden"];
      else if (kind === "flag") pair = ["on", "off"];
      else return;
    }
    const next = current === pair[0] ? pair[1] : pair[0];
    setState(ts.key, { kind, value: next, source: "load" }, "load");
    return;
  }
  if (action.type === "clear-state") {
    const cs = action as ClearStateAction;
    if (cs.key) deleteState(cs.key);
    return;
  }
}
