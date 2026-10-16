/**
 * Cart lines — the ONE definition of what a storefront cart holds, shared by
 * the React cart (`components/stripe/cartContext.tsx` in the app) and the
 * static runtime cart (`render/static/runtime/chunks/cart.ts`), which inlines
 * these functions by source. Both write the same `ph-cart-<pageId>`
 * localStorage entry, so they must agree on its shape.
 *
 * Because the static runtime inlines them with `fn.toString()`, every function
 * here is self-contained: no imports, no calls to each other, no nested named
 * functions (esbuild keepNames would wrap those in a `__name` helper).
 */

export interface CartLine {
  id: string;
  title: string;
  image?: string;
  /** Stripe price id, or the `pd:<rowId>` sentinel. Line identity. */
  priceId: string;
  priceFormatted: string;
  /** Minor units (cents). */
  priceAmount: number;
  currency: string;
  quantity: number;
  /** Selected options — "Size 32 / Stone". Absent on single-variant products. */
  variantLabel?: string;
}

export interface CartSummary {
  count: number;
  /** Minor units (cents). */
  totalAmount: number;
  /** "$64.00", or "" for an empty cart. What `cart:total` holds. */
  totalFormatted: string;
}

/**
 * Line for an add-to-cart item — the product item, already merged with its
 * matched variant by the add-to-cart action (`variantMatchStateKey`). A
 * matched variant brings its own `amount` / `formatted` and `option1..3`.
 * Returns null when the item has no price to check out with.
 */
export function toCartLine(item: any, quantity: number): CartLine | null {
  if (!item || typeof item !== "object") return null;
  const priceId = String((item.metadata && item.metadata.priceId) || item.priceId || "");
  if (!priceId) return null;
  const price = item.price && typeof item.price === "object" ? item.price : {};
  const variantPriced = typeof item.amount === "number" && typeof item.formatted === "string";
  const line: CartLine = {
    id: String(item.id || ""),
    title: String(item.title || ""),
    priceId: priceId,
    priceFormatted: String((variantPriced ? item.formatted : price.formatted) || ""),
    priceAmount: Number(variantPriced ? item.amount : price.amount) || 0,
    currency: String(price.currency || item.currency || "usd"),
    quantity: quantity > 0 ? Math.floor(quantity) : 1,
  };
  if (item.image) line.image = String(item.image);
  if (item.hasMultipleVariants) {
    // Option values in `optionNamesCsv` order (one per named axis), else
    // whatever option slots the variant fills.
    const slots = ["option1", "option2", "option3"];
    let named = 0;
    if (typeof item.optionNamesCsv === "string") {
      const names = item.optionNamesCsv.split(",");
      for (let i = 0; i < names.length; i++) if (names[i].trim()) named++;
    }
    const n = named ? Math.min(named, slots.length) : slots.length;
    const parts: string[] = [];
    for (let i = 0; i < n; i++) {
      const v = item[slots[i]];
      if (typeof v === "string" && v) parts.push(v);
    }
    if (parts.length) line.variantLabel = parts.join(" / ");
  }
  return line;
}

/**
 * Parse the stored cart. Returns null when the entry is unreadable or holds
 * anything that isn't a cart line, so the caller can drop it.
 */
export function parseCartLines(raw: string | null | undefined): CartLine[] | null {
  if (!raw) return [];
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  for (let i = 0; i < parsed.length; i++) {
    const l = parsed[i];
    if (
      !l ||
      typeof l !== "object" ||
      typeof l.id !== "string" ||
      typeof l.priceId !== "string" ||
      !l.priceId
    ) {
      return null;
    }
  }
  return parsed;
}

/** Add `quantity` of a line, merging with an existing line for the same price. */
export function addCartLine(lines: CartLine[], line: CartLine, quantity: number): CartLine[] {
  const next: CartLine[] = [];
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.priceId === line.priceId) {
      found = true;
      next.push(Object.assign({}, l, { quantity: l.quantity + quantity }));
    } else next.push(l);
  }
  if (!found) next.push(Object.assign({}, line, { quantity: quantity }));
  return next;
}

/** Set a line's quantity; zero or less removes it. */
export function setCartLineQuantity(
  lines: CartLine[],
  priceId: string,
  quantity: number
): CartLine[] {
  const next: CartLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.priceId !== priceId) next.push(l);
    else if (quantity > 0) next.push(Object.assign({}, l, { quantity: quantity }));
  }
  return next;
}

/** Item count and formatted subtotal — what `cart:count` / `cart:total` publish. */
export function summarizeCart(lines: CartLine[]): CartSummary {
  let count = 0;
  let totalAmount = 0;
  for (let i = 0; i < lines.length; i++) {
    const qty = Number(lines[i].quantity) || 0;
    count += qty;
    totalAmount += (Number(lines[i].priceAmount) || 0) * qty;
  }
  const currency = String((lines[0] && lines[0].currency) || "usd").toUpperCase();
  let totalFormatted = "";
  if (totalAmount > 0) {
    try {
      totalFormatted = new Intl.NumberFormat("en-US", { style: "currency", currency: currency }).format(
        totalAmount / 100
      );
    } catch (e) {
      totalFormatted = (totalAmount / 100).toFixed(2);
    }
  }
  return { count: count, totalAmount: totalAmount, totalFormatted: totalFormatted };
}

const CART_LINE_FNS = {
  toCartLine,
  parseCartLines,
  addCartLine,
  setCartLineQuantity,
  summarizeCart,
};

/**
 * The functions above as runtime source, for inlining into a static-runtime
 * scope: assigns each named one (default: all) onto `target`, an identifier
 * in that scope (e.g. `__phRT`). `__name` is esbuild keepNames' helper — given
 * an identity stand-in since the bundle that defines it isn't inlined. It is a
 * parameter, not a `var`: a `var` would hoist over the whole enclosing runtime
 * and shadow the `__name` the other chunks resolve.
 */
export function cartLineRuntimeSource(
  target: string,
  names: Array<keyof typeof CART_LINE_FNS> = Object.keys(CART_LINE_FNS) as Array<
    keyof typeof CART_LINE_FNS
  >
): string {
  let out = "";
  for (const name of names) out += `${target}.${name}=(${CART_LINE_FNS[name].toString()});`;
  return `(function(__name){${out}})(function(f){return f;});`;
}
