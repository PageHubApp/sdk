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

  if (action.type === "scroll-to") {
    prop.onClick = (e: any) => {
      if (enabled) return;
      e.preventDefault();
      const el = document.getElementById(action.anchor);
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
      const qty = (action as AddToCartAction).quantity || 1;
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
