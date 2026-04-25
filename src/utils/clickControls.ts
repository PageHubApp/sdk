/**
 * Runtime action handlers — attaches event listeners to component prop objects
 * based on the unified NodeAction system.
 */
import type { AddToCartAction, NodeAction, ShowHideAction, ToggleThemeAction } from "./action";
import { phStorage } from "./phStorage";

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
  if (method === "style") el.style.display = "block";
  else el.classList.remove("hidden");
}

function hideElement(el: HTMLElement, method: "class" | "style" = "class") {
  if (method === "style") el.style.display = "none";
  else el.classList.add("hidden");
}

function toggleElement(el: HTMLElement, method: "class" | "style" = "class") {
  if (method === "style") {
    el.style.display = el.style.display === "none" ? "block" : "none";
  } else {
    el.classList.toggle("hidden");
  }
}

// ─── Modal dispatch ────────────────────────────────────────────────────

function dispatchModal(el: HTMLElement, modalAction: "open" | "close" | "toggle") {
  el.dispatchEvent(
    new CustomEvent("pagehub:modal", { detail: { action: modalAction }, bubbles: false })
  );
}

// ─── Show/Hide + Tab logic ─────────────────────────────────────────────

function applyShowHide(action: ShowHideAction, e?: any) {
  const el = document.getElementById(action.target);
  if (!el) return;

  const method = action.method || "class";

  // Modal intercept
  if (el.hasAttribute("data-modal")) {
    const ma =
      action.direction === "show" ? "open" : action.direction === "hide" ? "close" : "toggle";
    dispatchModal(el, ma);
    return;
  }

  if (action.direction === "tab") {
    const group = action.group || action.target;
    document
      .querySelectorAll(`[data-tab-group="${group}"]`)
      .forEach(panel => hideElement(panel as HTMLElement, method));
    showElement(el, method);

    // Update active button states
    const button = e?.currentTarget as HTMLElement | undefined;
    const parent = button?.parentElement;
    if (parent) {
      parent.querySelectorAll("[data-tab-button]").forEach(btn => {
        (btn as HTMLElement).setAttribute("data-tab-active", "false");
        (btn as HTMLElement).style.opacity = "0.6";
      });
      if (button) {
        button.setAttribute("data-tab-active", "true");
        button.style.opacity = "1";
      }
    }
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

  if (el.hasAttribute("data-modal")) {
    dispatchModal(el, "close");
    return;
  }

  const method = action.method || "class";
  if (action.direction === "show") hideElement(el, method);
  else if (action.direction === "hide") showElement(el, method);
  // toggle: no revert on hover leave
}

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Attach runtime event handlers for actions that need JS (scroll-to, open-modal, show-hide, toggle-theme).
 * Link-type actions (link-url, link-page, email, phone) are handled via href — no JS needed.
 */
export function addActionHandlers(
  prop: any,
  action: NodeAction | null | undefined,
  enabled: boolean,
  context?: {
    itemContext?: Record<string, any> | null;
    onAddToCart?: (item: Record<string, any>, qty: number) => void;
  }
) {
  if (!action) return;

  // Anchor link — covers legacy `scroll-to` and unified `link` with `href: "#…"`.
  const anchor =
    action.type === "scroll-to"
      ? action.anchor
      : action.type === "link" && typeof action.href === "string" && action.href.startsWith("#")
        ? action.href.slice(1)
        : null;
  if (anchor) {
    prop.onClick = (e: any) => {
      if (enabled) return;
      e.preventDefault();
      const el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    return;
  }

  if (action.type === "open-modal") {
    prop.onClick = (e: any) => {
      if (enabled) return;
      e.preventDefault();
      const el = document.getElementById(action.anchor);
      if (el) dispatchModal(el, "toggle");
    };
    return;
  }

  if (action.type === "toggle-theme") {
    prop.onClick = (e: any) => {
      if (enabled) return;
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
    };
    return;
  }

  if (action.type === "add-to-cart") {
    prop.onClick = (e: any) => {
      if (enabled) return;
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
      // When quantityField is set, resolve live from the closest form input
      // with that name — lets users pick a quantity before adding to cart.
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
    };
    return;
  }

  if (action.type === "toggle-cart") {
    prop.onClick = (e: any) => {
      if (enabled) return;
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("pagehub:toggle-cart"));
    };
    return;
  }

  if (action.type === "cart-checkout") {
    prop.onClick = (e: any) => {
      if (enabled) return;
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("pagehub:cart-checkout"));
    };
    return;
  }

  if (action.type === "agent-send") {
    prop.onClick = (e: any) => {
      if (enabled) return;
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
        // Nudge React-controlled inputs: dispatch `input` so any onChange fires.
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.focus();
      }
    };
    return;
  }

  if (action.type === "manage-subscription") {
    prop.onClick = async (e: any) => {
      if (enabled) return;
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
    };
    return;
  }

  if (action.type !== "show-hide") return;

  if (!action.target) return;

  const trigger = action.trigger || "click";

  if (trigger === "hover") {
    prop.onMouseEnter = () => {
      if (enabled) return;
      applyShowHide(action);
    };
    prop.onMouseLeave = () => {
      if (enabled) return;
      revertShowHide(action);
    };
  }

  if (trigger === "click") {
    prop.onClick = (e: any) => {
      if (enabled) return;
      applyShowHide(action, e);
    };
  }
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
  addActionHandlers(prop, action, enabled);
}

/**
 * Initialize accordion single-open behavior for static/viewer HTML.
 * Listens for native <details> toggle events within [data-accordion-group]
 * containers and closes siblings when one opens.
 */
export function initAccordionGroups(root: Document | HTMLElement = document) {
  root.querySelectorAll("[data-accordion-group]").forEach(wrapper => {
    wrapper.addEventListener(
      "toggle",
      (e: Event) => {
        const target = e.target as HTMLDetailsElement;
        if (target.tagName !== "DETAILS" || !target.open) return;
        wrapper.querySelectorAll("details[open]").forEach(d => {
          if (d !== target) (d as HTMLDetailsElement).open = false;
        });
      },
      true
    );
  });
}
