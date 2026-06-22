// Cart storage, recompute, mutations, checkout, drawer items directive.
//
// Authored as a real TS function; `stringifyChunk` lifts the body into the
// runtime IIFE. Globals declared in [runtime-globals.d.ts](./runtime-globals.d.ts).

import { stringifyChunk } from "./stringifyChunk";

export const CART_CHUNK = stringifyChunk(function $cart() {
  // Cross-chunk function bindings via runtime registry. See
  // staticPublishRuntime.ts preamble for the why.
  const { setState, getStateValue, fireAnalytics } = __phRT;

  function readCartFromStorage() {
    if (!PAGE_ID) return [];
    try {
      const raw = localStorage.getItem("ph-cart-" + PAGE_ID);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }
  function writeCartToStorage(items: any[]) {
    if (!PAGE_ID) return;
    try {
      localStorage.setItem("ph-cart-" + PAGE_ID, JSON.stringify(items));
    } catch (e) {}
  }
  function recomputeCartState(items: any[]) {
    let count = 0,
      total = 0;
    for (let i = 0; i < items.length; i++) {
      const line = items[i] || {};
      const qty = Number(line.quantity) || 0;
      count += qty;
      const amount =
        (line.item && line.item.price && Number(line.item.price.amount)) || 0;
      total += amount * qty;
    }
    setState(
      PH_CART_ITEMS_JSON,
      { kind: "value", value: JSON.stringify(items), source: "runtime" },
      "cart"
    );
    setState(
      PH_CART_COUNT,
      { kind: "value", value: String(count), source: "runtime" },
      "cart"
    );
    setState(
      PH_CART_TOTAL,
      { kind: "value", value: String(total), source: "runtime" },
      "cart"
    );
  }
  function addToCart(item: any, qty: number) {
    const items = readCartFromStorage();
    const idKey = (item && (item.priceId || item.id)) || null;
    if (!idKey) return;
    let found = false;
    for (let i = 0; i < items.length; i++) {
      const line = items[i];
      const lineKey = (line.item && (line.item.priceId || line.item.id)) || null;
      if (lineKey === idKey) {
        line.quantity = (Number(line.quantity) || 0) + qty;
        found = true;
        break;
      }
    }
    if (!found) items.push({ item: item, quantity: qty });
    writeCartToStorage(items);
    recomputeCartState(items);
    fireAnalytics("add_to_cart", {
      value: item && item.price && item.price.amount,
      currency: item && item.price && item.price.currency,
    });
  }
  function setCartQuantity(priceId: string, qty: number) {
    if (!priceId) return;
    const items = readCartFromStorage();
    const next: any[] = [];
    for (let i = 0; i < items.length; i++) {
      const line = items[i];
      const lineKey = (line.item && (line.item.priceId || line.item.id)) || null;
      if (lineKey === priceId) {
        if (qty > 0) {
          line.quantity = qty;
          next.push(line);
        }
      } else next.push(line);
    }
    writeCartToStorage(next);
    recomputeCartState(next);
  }
  function removeCartItem(priceId: string) {
    setCartQuantity(priceId, 0);
  }
  function cartCheckout() {
    const raw = getStateValue(PH_CART_ITEMS_JSON);
    let items: any[] = [];
    try {
      items = raw ? JSON.parse(raw as string) : [];
    } catch (e) {}
    if (!items.length || !PAGE_ID) return;
    fetch("/api/stripe/storefront-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageId: PAGE_ID,
        // `priceId` is a real Stripe price id OR the `pd:<rowId>` sentinel for a
        // PageHub-owned product (the server re-prices it via price_data).
        items: items.map(function (l: any) {
          return {
            priceId:
              (l.item &&
                (l.item.priceId ||
                  (l.item.metadata && l.item.metadata.priceId))) ||
              null,
            quantity: l.quantity,
          };
        }),
      }),
      credentials: "include",
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (d && d.url) window.location.href = d.url;
      })
      .catch(function () {});
  }

  function escapeHTML(s: unknown) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  const CART_DEFAULTS: Record<string, string> = {
    "empty-class":
      "text-base-content/50 flex flex-col items-center justify-center gap-4 py-16",
    "empty-text": "Your cart is empty",
    "empty-text-class": "text-sm",
    "list-class": "flex flex-col gap-4",
    "row-class": "flex gap-4",
    "image-class": "size-20 shrink-0 rounded-lg object-cover",
    "body-class": "flex flex-1 flex-col gap-1",
    "title-class": "line-clamp-2 text-sm font-semibold",
    "variant-class": "text-base-content/60 text-xs",
    "price-class": "text-primary text-sm font-bold",
    "controls-class": "mt-1 flex items-center gap-2",
    "quantity-class": "min-w-[1.5rem] text-center text-sm font-medium",
    "control-button-class": "btn btn-ghost btn-xs btn-circle",
    "remove-button-class": "btn btn-ghost btn-xs btn-circle text-error ml-auto",
  };
  function renderCartItems(_el: Element, c: Record<string, string>) {
    const items = readCartFromStorage();
    if (!items.length) {
      return (
        '<div class="' +
        escapeHTML(c["empty-class"]) +
        '"><p class="' +
        escapeHTML(c["empty-text-class"]) +
        '">' +
        escapeHTML(c["empty-text"]) +
        "</p></div>"
      );
    }
    const parts = ['<div class="' + escapeHTML(c["list-class"]) + '">'];
    for (let j = 0; j < items.length; j++) {
      const line = items[j] || {};
      const it = line.item || {};
      const qty = Number(line.quantity) || 0;
      const pid = escapeHTML(it.priceId || it.id || "");
      const img = it.image
        ? '<img src="' +
          escapeHTML(it.image) +
          '" alt="' +
          escapeHTML(it.title || "") +
          '" class="' +
          escapeHTML(c["image-class"]) +
          '" />'
        : "";
      const variant = it.variantLabel
        ? '<p class="' +
          escapeHTML(c["variant-class"]) +
          '">' +
          escapeHTML(it.variantLabel) +
          "</p>"
        : "";
      const price = it.priceFormatted
        ? '<p class="' +
          escapeHTML(c["price-class"]) +
          '">' +
          escapeHTML(it.priceFormatted) +
          "</p>"
        : "";
      const btn = escapeHTML(c["control-button-class"]);
      parts.push(
        '<div class="' +
          escapeHTML(c["row-class"]) +
          '">' +
          img +
          '<div class="' +
          escapeHTML(c["body-class"]) +
          '"><p class="' +
          escapeHTML(c["title-class"]) +
          '">' +
          escapeHTML(it.title || "") +
          "</p>" +
          variant +
          price +
          '<div class="' +
          escapeHTML(c["controls-class"]) +
          '">' +
          '<button type="button" data-ph-cart-action="dec" data-ph-cart-priceid="' +
          pid +
          '" class="' +
          btn +
          '">&minus;</button>' +
          '<span class="' +
          escapeHTML(c["quantity-class"]) +
          '">' +
          qty +
          "</span>" +
          '<button type="button" data-ph-cart-action="inc" data-ph-cart-priceid="' +
          pid +
          '" class="' +
          btn +
          '">+</button>' +
          '<button type="button" data-ph-cart-action="remove" data-ph-cart-priceid="' +
          pid +
          '" class="' +
          escapeHTML(c["remove-button-class"]) +
          '">&times;</button>' +
          "</div></div></div>"
      );
    }
    parts.push("</div>");
    return parts.join("");
  }
  Alpine.directive(
    "cart-items",
    function (
      el: HTMLElement,
      _meta: unknown,
      utils: {
        cleanup: (fn: () => void) => void;
        effect: (fn: () => void) => void;
      }
    ) {
      const cfg: Record<string, string> = {};
      for (const k in CART_DEFAULTS) {
        cfg[k] = el.getAttribute("data-" + k) || CART_DEFAULTS[k];
      }
      function render() {
        el.innerHTML = renderCartItems(el, cfg);
      }
      function onClick(ev: MouseEvent) {
        const target = ev.target as HTMLElement | null;
        const btn = target && target.closest && target.closest("[data-ph-cart-action]");
        if (!btn) return;
        const pid = btn.getAttribute("data-ph-cart-priceid");
        const act = btn.getAttribute("data-ph-cart-action");
        if (!pid) return;
        const items = readCartFromStorage();
        let current = 0;
        for (let k = 0; k < items.length; k++) {
          const lk =
            items[k].item && (items[k].item.priceId || items[k].item.id);
          if (lk === pid) {
            current = Number(items[k].quantity) || 0;
            break;
          }
        }
        if (act === "inc") setCartQuantity(pid, current + 1);
        else if (act === "dec") setCartQuantity(pid, current - 1);
        else if (act === "remove") removeCartItem(pid);
      }
      el.addEventListener("click", onClick as EventListener);
      utils.cleanup(function () {
        el.removeEventListener("click", onClick as EventListener);
      });
      utils.effect(function () {
        void _store.entries[PH_CART_ITEMS_JSON];
        render();
      });
    }
  );

  // Publish cross-chunk functions to the runtime registry. See state.ts.
  // Bootstrap also surfaces setCartQuantity and removeCartItem via
  // `window.PageHub`; the registry covers cross-chunk callers internally.
  Object.assign(__phRT, {
    readCartFromStorage,
    writeCartToStorage,
    recomputeCartState,
    addToCart,
    setCartQuantity,
    removeCartItem,
    cartCheckout,
  });
});
