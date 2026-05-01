import { toHTML as containerToHTML } from "../components/Container/Container.craft";
import { BUILTIN_COMPONENT_DEFS } from "../core/componentRegistry";
import { processForStatic } from "../define/processors/forStatic";
import type { ToHTMLFn } from "../utils/staticHtml";

const cartBadgeToHTML: ToHTMLFn = (props, children, ctx) => {
  // CartBadge renders the count pill client-side via `state["cart:count"]`
  // subscription (see components/stripe/CartBadge.tsx). Static export emits
  // only the wrapper + children; the pill appears once cartContext mounts.
  const cls = props.className || "relative";
  cls.split(/\s+/).forEach((c: string) => c && ctx.classes.add(c));
  return `<div class="${cls}">${children || ""}</div>`;
};

export const defaultResolver: Record<string, ToHTMLFn> = {
  ...processForStatic(BUILTIN_COMPONENT_DEFS),
  Header: containerToHTML,
  Footer: containerToHTML,
  CartBadge: cartBadgeToHTML,
  CartDrawer: containerToHTML,
  CartItems: containerToHTML,
  CartSubtotal: containerToHTML,
  CheckoutBanner: containerToHTML,
  ProductDisplay: containerToHTML,
};
