// Cart storage, recompute, mutations, checkout, drawer items directive.
//
// Authored as a real TS function; `stringifyChunk` lifts the body into the
// runtime IIFE. Globals declared in [runtime-globals.d.ts](./runtime-globals.d.ts).

import { stringifyChunk } from "./stringifyChunk";
import { cartLineRuntimeSource } from "../../../../utils/cart/cartLine";

// The cart-line model (line shape, add / set-quantity, subtotal) is the same
// source the React cart imports — inlined onto `__phRT` ahead of this chunk.
const CART_BODY = stringifyChunk(function $cart() {
  // Cross-chunk function bindings via runtime registry. See
  // staticPublishRuntime.ts preamble for the why.
  const { setState, setVisibility, getStateValue, fireAnalytics } = __phRT;
  const { toCartLine, parseCartLines, addCartLine, setCartLineQuantity, summarizeCart } = __phRT;

  function readCartFromStorage() {
    if (!PAGE_ID) return [];
    let raw: string | null = null;
    try {
      raw = localStorage.getItem("ph-cart-" + PAGE_ID);
    } catch (e) {
      return [];
    }
    const lines = parseCartLines(raw);
    if (lines) return lines;
    // Not cart lines (corrupt, or another shape) — drop it, as the React cart does.
    try {
      localStorage.removeItem("ph-cart-" + PAGE_ID);
    } catch (e) {}
    return [];
  }
  function writeCartToStorage(items: any[]) {
    if (!PAGE_ID) return;
    try {
      if (items.length) localStorage.setItem("ph-cart-" + PAGE_ID, JSON.stringify(items));
      else localStorage.removeItem("ph-cart-" + PAGE_ID);
    } catch (e) {}
  }
  function recomputeCartState(items: any[]) {
    const sum = summarizeCart(items);
    setState(
      PH_CART_ITEMS_JSON,
      { kind: "value", value: JSON.stringify(items), source: "runtime" },
      "cart"
    );
    setState(
      PH_CART_COUNT,
      { kind: "value", value: String(sum.count), source: "runtime" },
      "cart"
    );
    setState(
      PH_CART_TOTAL,
      { kind: "value", value: sum.totalFormatted, source: "runtime" },
      "cart"
    );
  }
  function addToCart(item: any, qty: number) {
    const line = toCartLine(item, qty);
    if (!line) {
      setState(
        PH_CART_ERROR,
        { kind: "value", value: "This product is not available for purchase", source: "runtime" },
        "cart"
      );
      return;
    }
    setState(PH_CART_ERROR, { kind: "value", value: "", source: "runtime" }, "cart");
    const items = addCartLine(readCartFromStorage(), line, qty);
    writeCartToStorage(items);
    recomputeCartState(items);
    // Show what was added, as the React cart does.
    setVisibility(PH_CART_OPEN, "shown", "cart");
    fireAnalytics("add_to_cart", {
      value: line.priceAmount,
      currency: line.currency,
    });
  }
  function setCartQuantity(priceId: string, qty: number) {
    if (!priceId) return;
    const next = setCartLineQuantity(readCartFromStorage(), priceId, qty);
    writeCartToStorage(next);
    recomputeCartState(next);
  }
  function removeCartItem(priceId: string) {
    setCartQuantity(priceId, 0);
  }
  // The page the buyer is on, without its query or hash — Stripe sends them
  // back here with `?checkout=success|cancel` (same as cartContext.tsx).
  function checkoutReturnUrl(status: string) {
    return window.location.origin + window.location.pathname + "?checkout=" + status;
  }
  function setCartError(message: string) {
    setState(
      PH_CART_ERROR,
      { kind: "value", value: message, source: "runtime" },
      "cart-checkout"
    );
  }
  function cartCheckout() {
    const raw = getStateValue(PH_CART_ITEMS_JSON);
    let items: any[] = [];
    try {
      items = raw ? JSON.parse(raw as string) : [];
    } catch (e) {}
    if (!items.length || !PAGE_ID) return;
    // Written by the promo input's FormElement.stateBinding.
    const promotionCode = String(getStateValue("cart:promo") || "").trim();
    fetch(PH_BASE + "/api/stripe/storefront-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageId: PAGE_ID,
        // `priceId` is a real Stripe price id OR the `pd:<rowId>` sentinel for a
        // PageHub-owned product (the server re-prices it via price_data).
        items: items.map(function (l: any) {
          return { priceId: l.priceId, quantity: l.quantity };
        }),
        successUrl: checkoutReturnUrl("success"),
        cancelUrl: checkoutReturnUrl("cancel"),
        promotionCode: promotionCode || undefined,
      }),
      credentials: "include",
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        if (d && d.url) {
          window.location.href = d.url;
          return;
        }
        if (d && d.code === "invalid_promo") {
          setState(
            "cart:promo-invalid",
            { kind: "value", value: d.error || "That promo code isn't valid", source: "runtime" },
            "cart-checkout"
          );
        }
        setCartError((d && d.error) || "Checkout didn't start. Try again in a moment.");
      })
      .catch(function () {
        setCartError("Couldn't reach checkout. Check your connection and try again.");
      });
  }

  // Back from Stripe: a paid order empties the cart. Mirrors the status to
  // `cart:checkout-status` for thank-you / cancelled panels, then drops the
  // param so a refresh doesn't replay it.
  function handleCheckoutReturn() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("checkout");
    if (!status) return;
    if (status === "success") {
      writeCartToStorage([]);
      recomputeCartState([]);
      setVisibility(PH_CART_OPEN, "hidden", "cart-checkout");
    }
    if (status === "success" || status === "cancel") {
      setState(
        "cart:checkout-status",
        { kind: "value", value: status, source: "load" },
        "cart-checkout"
      );
    }
    params.delete("checkout");
    const qs = params.toString();
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (qs ? "?" + qs : "") + window.location.hash
    );
  }

  function escapeHTML(s: unknown) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  // Copy + classes come from the host's CartItems toHTML, which stamps every
  // one as `data-<key>` with its defaults filled in.
  const CART_ATTRS = [
    "empty-class", "empty-text", "empty-text-class", "list-class", "row-class",
    "image-class", "body-class", "title-class", "variant-class", "price-class",
    "controls-class", "quantity-class", "control-button-class", "remove-button-class",
  ];
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
      const it = items[j];
      const qty = Number(it.quantity) || 0;
      const pid = escapeHTML(it.priceId);
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
      for (let i = 0; i < CART_ATTRS.length; i++) {
        cfg[CART_ATTRS[i]] = el.getAttribute("data-" + CART_ATTRS[i]) || "";
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
          if (items[k].priceId === pid) {
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
    handleCheckoutReturn,
  });
});

export const CART_CHUNK = "{" + cartLineRuntimeSource("__phRT") + "}" + CART_BODY;
