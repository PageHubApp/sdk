/**
 * CartItems' default copy and classes — the one source for the editor render,
 * the walker render and the static toHTML. The static runtime builds cart rows
 * in the browser from the `data-*` attrs toHTML stamps, so toHTML always stamps
 * every value: that's also how these classes reach the SSR CSS compiler.
 */

export const CART_ITEMS_DEFAULTS = {
  emptyBoxClass: "text-base-content/50 flex flex-col items-center justify-center gap-4 py-16",
  emptyTextClass: "text-sm",
  emptyText: "Your cart is empty",
  listClassName: "flex flex-col gap-4",
  rowClassName: "flex gap-4",
  imageClassName: "size-20 shrink-0 rounded-lg object-cover",
  bodyClassName: "flex flex-1 flex-col gap-1",
  titleClassName: "line-clamp-2 text-sm font-semibold",
  variantClassName: "text-base-content/60 text-xs",
  priceClassName: "text-primary text-sm font-bold",
  controlsClassName: "mt-1 flex items-center gap-2",
  quantityClassName: "min-w-[1.5rem] text-center text-sm font-medium",
  controlButtonClassName: "btn btn-ghost btn-xs btn-circle",
  removeButtonClassName: "btn btn-ghost btn-xs btn-circle text-error ml-auto",
};

export type CartItemsSettings = typeof CART_ITEMS_DEFAULTS;

/** Props over defaults; empty strings fall back like the old `props.x || "…"`. */
export function withCartItemsDefaults(props: Record<string, any>): CartItemsSettings {
  const out = { ...CART_ITEMS_DEFAULTS };
  for (const k of Object.keys(out) as (keyof CartItemsSettings)[]) {
    if (typeof props[k] === "string" && props[k]) out[k] = props[k];
  }
  return out;
}
