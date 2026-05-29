import type { AddToCartAction, NodeAction } from "../../action";
import { getStateValue, setState, setVisibility } from "../../state/stateRegistry";
import { actionGatePasses } from "../gates";
import { ActionContext, chain, interpolateItem } from "../internal";
import { sdkLog } from "../../logger";

export function attachAddToCart(
  prop: any,
  action: NodeAction,
  enabled: boolean,
  context?: ActionContext
) {
  if (action.type !== "add-to-cart") return;
  chain(prop, "onClick", (e, run) => {
    run(e);
    if (enabled) return;
    if (!actionGatePasses(action)) return;
    e.preventDefault();
    const baseItem = context?.itemContext;
    if (!baseItem) {
      sdkLog.warn(
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
      sdkLog.warn(
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
}

export function attachToggleCart(prop: any, action: NodeAction, enabled: boolean) {
  if (action.type !== "toggle-cart") return;
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
}

export function attachCartCheckout(prop: any, action: NodeAction, enabled: boolean) {
  if (action.type !== "cart-checkout") return;
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
}

export function attachManageSubscription(prop: any, action: NodeAction, enabled: boolean) {
  if (action.type !== "manage-subscription") return;
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
}
