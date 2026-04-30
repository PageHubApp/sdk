/**
 * Runtime action handlers — attaches event listeners to component prop objects
 * based on the unified NodeAction system.
 */
import type {
  AddToCartAction,
  ClearStateAction,
  DecrementStateAction,
  IncrementStateAction,
  NodeAction,
  SetStateAction,
  ShowHideAction,
  ToggleStateAction,
  ToggleThemeAction,
} from "./action";
import { phStorage } from "./phStorage";
import { deleteState, getState, getStateValue, setState, setVisibility } from "./stateRegistry";
import { evaluateConditionGroups } from "./conditions/evaluate";
import { buildConditionEvalFns } from "./conditions/clientScript";
import type { ConditionContext } from "./conditions/types";
import { getAuthState } from "./design/variables";

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

// ─── Hover-revert state, keyed by action identity ────────────────────
//
// React re-renders rebuild the closure each time `addActionHandlers` runs,
// so closure-local `didSet`/`prevValue` flags are LOST between a hover
// `enter` and the corresponding `leave` if a state-driven re-render happens
// in between. The `action` object reference stays stable across renders
// (CraftJS preserves prop identity for unchanged props), so we key the
// hover scratch state on the action itself via WeakMap. GC follows action
// disposal automatically.

interface HoverScratch {
  didSet: boolean;
  prevValue: string | null | undefined;
  resolvedKey: string | undefined;
  prevEntry?: ReturnType<typeof getState>;
}
const _hoverScratch = new WeakMap<object, HoverScratch>();
function hoverState(action: NodeAction): HoverScratch {
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

/**
 * Resolve a state-action `key` (set/toggle/clear/increment/decrement-state +
 * variantMatchStateKey + agent-send field) against the current item context.
 * Returns `""` when interp leaves un-interpolated `{{item.X}}` tokens —
 * matches the variant-match guard in `computedState.ts`. Action handlers
 * treat `""` as a no-op so writes to junk keys are silently dropped instead
 * of polluting the registry with literal-template strings.
 */
function resolveActionKey(
  raw: string | undefined | null,
  item: Record<string, any> | null | undefined
): string {
  if (!raw) return "";
  const out = interpolateItem(raw, item);
  if (/\{\{\s*item\./i.test(out)) return "";
  return out || raw;
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
function attachOne(prop: any, action: NodeAction, enabled: boolean, context?: ActionContext) {
  // Anchor link — `scroll-to` or unified `link` with `href: "#…"`. Special
  // anchor keywords: `"top"` scrolls the window to the page top (used by
  // pagination + back-to-top buttons without needing a real DOM element).
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
      if (anchor === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
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
      const baseItem = context?.itemContext;
      if (!baseItem) {
        console.warn(
          "[PageHub] add-to-cart action requires a data-bound Container parent. Place this button inside a Container with a dataSource."
        );
        return;
      }
      const cartAction = action as AddToCartAction;
      // Quantity: prefer the named form field, fall back to static quantity,
      // fall back to 1. Field lookup is intentionally lightweight — quantity
      // pickers are author-controlled.
      let qty = cartAction.quantity || 1;
      if (cartAction.quantityField) {
        const btn = e.currentTarget as HTMLElement | null;
        const scope = btn?.closest("form, section, body");
        const field = scope?.querySelector(
          `[name="${cartAction.quantityField}"]`
        ) as HTMLInputElement | null;
        const parsed = field ? Number(field.value) : NaN;
        if (Number.isFinite(parsed) && parsed > 0) qty = Math.floor(parsed);
      }
      // Variant resolution: read the matched-variant JSON from state (written
      // by the variant Container's `computedStateBindings`). Merge over the
      // base item — the matched variant carries `priceId`/`amount`/`image`
      // overrides; the base item carries `id`/`title`/`hasMultipleVariants`/etc.
      // No DOM scrape, no `[data-variant-selected]` walk.
      let item = baseItem;
      let matchedOk = false;
      if (cartAction.variantMatchStateKey) {
        const variantKey =
          interpolateItem(cartAction.variantMatchStateKey, context?.itemContext) ??
          cartAction.variantMatchStateKey;
        const raw = getStateValue(variantKey);
        if (raw) {
          try {
            const matched = JSON.parse(raw);
            if (matched && typeof matched === "object") {
              item = {
                ...baseItem,
                ...matched,
                metadata: {
                  ...((baseItem as any).metadata || {}),
                  priceId: matched.priceId,
                  sku: matched.sku || (baseItem as any).metadata?.sku,
                },
              };
              matchedOk = true;
            }
          } catch {
            /* malformed JSON — fall through to error path */
          }
        }
      }
      // Multi-variant products MUST resolve to a matched variant; otherwise
      // the cart line gets the wrong priceId and Stripe checkout silently
      // succeeds at the base price. Surface the error via state so author
      // UI can gate on it (Container with `state cart:error exists`).
      if ((baseItem as any).hasMultipleVariants && !matchedOk) {
        try {
          setState(
            "cart:error",
            {
              kind: "value",
              value: "Select an option before adding to cart",
              source: "runtime",
            },
            "add-to-cart"
          );
        } catch {}
        console.warn(
          "[PageHub] add-to-cart: multi-variant product but no matched variant in state — wire `variantMatchStateKey` and a Container with `computedStateBindings: [{ compute: { type: 'variant-match', ... } }]`."
        );
        return;
      }
      // Clear any stale error from a prior incomplete attempt.
      try {
        setState("cart:error", { kind: "value", value: "", source: "runtime" }, "add-to-cart");
      } catch {}
      context?.onAddToCart?.(item, qty);
      // Publish to the central state registry — cart provider subscribes via
      // `useStateValue("cart:add-tick")`, then reads the JSON payload from
      // `cart:add-payload`. Nonce makes repeated adds of the same item rerun.
      try {
        setState(
          "cart:add-payload",
          { kind: "value", value: JSON.stringify({ item, quantity: qty }) },
          "add-to-cart"
        );
        setState("cart:add-tick", { kind: "value", value: String(Date.now()) }, "add-to-cart");
      } catch {}
    });
    return;
  }

  if (action.type === "toggle-cart") {
    chain(prop, "onClick", (e, run) => {
      run(e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      e.preventDefault();
      // Toggle the canonical cart visibility key. Drawer + provider both read
      // `cart:open` via `useStateValue` — single source of truth.
      const cur = getStateValue("cart:open");
      setVisibility("cart:open", cur === "shown" ? "hidden" : "shown", "toggle-cart");
    });
    return;
  }

  if (action.type === "cart-checkout") {
    chain(prop, "onClick", (e, run) => {
      run(e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      e.preventDefault();
      // Bump the checkout tick — provider subscribes and runs the network
      // call. Tick value is `Date.now()` so each click rerenders the
      // subscriber even when content is unchanged.
      try {
        setState(
          "cart:checkout-tick",
          { kind: "value", value: String(Date.now()) },
          "cart-checkout"
        );
      } catch {}
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
      const rawFieldName = (action as any).field || "agentMessage";
      const fieldName = interpolateItem(rawFieldName, context?.itemContext) ?? rawFieldName;
      const field = root.querySelector(`[name="${fieldName}"]`) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      const value = (field?.value || "").trim();
      if (!value) return;
      // Write to the chat's outbox state slot. The chat's DOM `id` (set by
      // the wrapper from its anchor map, e.g. `ph-chat-${nodeId}`) is the
      // namespace — multiple chats on one page can coexist without collision.
      const chatId = root.id || "ph-chat-default";
      try {
        setState(
          `${chatId}:outbox`,
          {
            kind: "value",
            value: JSON.stringify({ nonce: Date.now(), value }),
          },
          "agent-send"
        );
      } catch {}
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
      const k = resolveActionKey(ss.key, context?.itemContext);
      const v = interpolateItem(ss.value, context?.itemContext);
      setState(
        k,
        { kind: ss.kind ?? "value", value: v, source: enabled ? "editor-preview" : "runtime" },
        "set-state"
      );
    };
    if (isHover) {
      // Hover-restore captures prior value via WeakMap keyed on the action
      // identity — survives mid-hover re-renders that would blow away a
      // closure-local flag. Click triggers don't restore (intentionally sticky).
      const hoverEnter = (e: any, run: any) => {
        run(e);
        if (!enabled && !actionGatePasses(action)) return;
        if (!ss.key) return;
        const s = hoverState(action);
        s.resolvedKey = resolveActionKey(ss.key, context?.itemContext);
        s.prevValue = getStateValue(s.resolvedKey);
        const v = interpolateItem(ss.value, context?.itemContext);
        setState(
          s.resolvedKey,
          { kind: ss.kind ?? "value", value: v, source: enabled ? "editor-preview" : "runtime" },
          "set-state"
        );
        s.didSet = true;
      };
      const hoverLeave = (e: any, run: any) => {
        run(e);
        const s = hoverState(action);
        if (!s.didSet || !s.resolvedKey) return;
        s.didSet = false;
        if (s.prevValue === undefined) {
          deleteState(s.resolvedKey);
        } else {
          setState(
            s.resolvedKey,
            {
              kind: ss.kind ?? "value",
              value: s.prevValue,
              source: enabled ? "editor-preview" : "runtime",
            },
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
    const resolveKey = (): string => resolveActionKey(ts.key, context?.itemContext);
    const resolvePair = (kind: string, k: string): [string, string] | null => {
      if (ts.values) return ts.values;
      if (kind === "visibility") return ["shown", "hidden"];
      if (kind === "flag") return ["on", "off"];
      console.warn(
        `[PageHub] toggle-state on key "${k}" (kind: ${kind}) needs explicit values. Skipping.`
      );
      return null;
    };
    const writeFlip = (k: string): void => {
      if (!k) return;
      const current = getStateValue(k);
      const kind = ts.kind ?? getState(k)?.kind ?? "flag";
      const pair = resolvePair(kind, k);
      if (!pair) return;
      const next = current === pair[0] ? pair[1] : pair[0];
      setState(
        k,
        { kind, value: next, source: enabled ? "editor-preview" : "runtime" },
        "toggle-state"
      );
    };
    if (isHover) {
      const hoverEnter = (e: any, run: any) => {
        run(e);
        if (!enabled && !actionGatePasses(action)) return;
        if (!ts.key) return;
        const s = hoverState(action);
        s.resolvedKey = resolveKey();
        s.prevValue = getStateValue(s.resolvedKey);
        writeFlip(s.resolvedKey);
        s.didSet = true;
      };
      const hoverLeave = (e: any, run: any) => {
        run(e);
        const s = hoverState(action);
        if (!s.didSet || !s.resolvedKey) return;
        s.didSet = false;
        const kind = ts.kind ?? getState(s.resolvedKey)?.kind ?? "flag";
        if (s.prevValue === undefined) {
          deleteState(s.resolvedKey);
        } else {
          setState(
            s.resolvedKey,
            { kind, value: s.prevValue, source: enabled ? "editor-preview" : "runtime" },
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
        if (!ts.key) return;
        writeFlip(resolveKey());
      });
    }
    return;
  }

  if (action.type === "increment-state" || action.type === "decrement-state") {
    const sa = action as IncrementStateAction | DecrementStateAction;
    const trig = sa.trigger || "click";
    // Interval trigger is wired via Container's mount effect (fireIntervalAction).
    if (trig === "interval" || trig === "load") return;
    const fire = (e: any, run: any) => {
      run(e);
      if (!enabled && !actionGatePasses(action)) return;
      const k = resolveActionKey(sa.key, context?.itemContext);
      if (!k) return;
      applyStateStep(sa, k);
    };
    if (trig === "hover") {
      chain(prop, "onMouseEnter", fire);
    } else {
      chain(prop, "onClick", fire);
    }
    return;
  }

  if (action.type === "clear-state") {
    const cs = action as ClearStateAction;
    const isHover = (cs.trigger || "click") === "hover";
    if (isHover) {
      const hoverEnter = (e: any, run: any) => {
        run(e);
        if (!enabled && !actionGatePasses(action)) return;
        if (!cs.key) return;
        const s = hoverState(action);
        s.resolvedKey = resolveActionKey(cs.key, context?.itemContext);
        s.prevEntry = getState(s.resolvedKey);
        deleteState(s.resolvedKey);
        s.didSet = true;
      };
      const hoverLeave = (e: any, run: any) => {
        run(e);
        const s = hoverState(action);
        if (!s.didSet || !s.resolvedKey) return;
        s.didSet = false;
        if (!s.prevEntry) return;
        setState(
          s.resolvedKey,
          { kind: s.prevEntry.kind, value: s.prevEntry.value, source: s.prevEntry.source },
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
        const k = resolveActionKey(cs.key, context?.itemContext);
        deleteState(k);
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
export function getLoadActionScript({
  mobileBreakpoint = 768,
}: { mobileBreakpoint?: number } = {}): string {
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
    setState(ss.key, { kind: ss.kind ?? "value", value: ss.value, source: "load" }, "load");
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
  if (action.type === "increment-state" || action.type === "decrement-state") {
    applyStateStep(action as IncrementStateAction | DecrementStateAction);
    return;
  }
}

/**
 * Resolve a `max` field that can be a literal number or a `state:<key>` pointer
 * to another state entry (for dynamic upper bounds — slide count, item count).
 */
function resolveBound(value: number | string | undefined): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return undefined;
  if (value.startsWith("state:")) {
    const refKey = value.slice(6);
    const refVal = parseInt(getStateValue(refKey) ?? "", 10);
    return Number.isFinite(refVal) ? refVal : undefined;
  }
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Apply increment-state / decrement-state arithmetic with min/max/wrap.
 * `keyOverride` lets callers with item context pass a pre-interpolated key
 * (e.g. click-trigger handlers inside a repeater). Interval/load callers
 * have no item context, so they pass undefined and the literal action.key
 * is used.
 */
export function applyStateStep(
  action: IncrementStateAction | DecrementStateAction,
  keyOverride?: string
): void {
  const key = keyOverride || action.key;
  if (!key) return;
  const sign = action.type === "increment-state" ? 1 : -1;
  const step = (action.step ?? 1) * sign;
  const cur = parseInt(getStateValue(key) ?? "0", 10) || 0;
  let next = cur + step;
  const min = action.min;
  const max = resolveBound(action.max);
  if (action.wrap) {
    if (max !== undefined && next > max) next = min ?? 0;
    else if (min !== undefined && next < min) next = max ?? min;
  } else {
    if (max !== undefined) next = Math.min(max, next);
    if (min !== undefined) next = Math.max(min, next);
  }
  setState(key, { kind: "value", value: String(next), source: "runtime" }, action.type);
}

/**
 * Set up `trigger: "interval"` actions on mount. Returns a cleanup function
 * that clears all started intervals — caller (Container's mount effect) MUST
 * call it on unmount.
 *
 * Honors `action.conditions` per-tick (re-evaluates every fire so gating can
 * pause an autoscroll without tearing down the interval).
 *
 * Currently dispatches `increment-state` / `decrement-state` / `set-state` /
 * `toggle-state` / `clear-state` / `show-hide`. Anything else is ignored.
 */
export function fireIntervalActions(actions: NodeAction[]): () => void {
  const ids: number[] = [];
  for (const action of actions) {
    if ((action as any).trigger !== "interval") continue;
    const ms = (action as any).intervalMs;
    if (typeof ms !== "number" || ms < 50) continue;
    const id = window.setInterval(() => {
      if (!actionGatePasses(action)) return;
      if (action.type === "increment-state" || action.type === "decrement-state") {
        applyStateStep(action as IncrementStateAction | DecrementStateAction);
        return;
      }
      if (action.type === "set-state") {
        const ss = action as SetStateAction;
        if (!ss.key) return;
        setState(
          ss.key,
          { kind: ss.kind ?? "value", value: ss.value, source: "runtime" },
          "set-state"
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
        setState(ts.key, { kind, value: next, source: "runtime" }, "toggle-state");
        return;
      }
      if (action.type === "clear-state") {
        const cs = action as ClearStateAction;
        if (cs.key) deleteState(cs.key);
        return;
      }
      if (action.type === "show-hide") {
        applyShowHide(action as ShowHideAction);
        return;
      }
    }, ms);
    ids.push(id);
  }
  return () => {
    for (const id of ids) window.clearInterval(id);
  };
}
