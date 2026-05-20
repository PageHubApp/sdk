import { toHTML as containerToHTML } from "../components/Container/Container.craft";
import { toHTML as dataToHTML } from "../components/Data/Data.toHTML";
import { BUILTIN_COMPONENT_DEFS } from "../core/componentRegistry";
import { processForStatic } from "../define/processors/forStatic";
import {
  ariaAttrs,
  getInlineStyle,
  handlerAttrs,
  staticClasses,
  tag,
  type ToHTMLFn,
} from "../utils/staticHtml";

/**
 * CartBadge static export.
 *
 * Emits the wrapper `<div>` + children + an absolutely-positioned count pill
 * tagged with `data-state-text="cart:count"` so the vanilla runtime can swap
 * its text content when `state["cart:count"]` updates. Default text is `"0"`
 * (matches cartContext's pre-hydration state); the pill is hidden by default
 * (`hidden` class) and `data-state-show-when-truthy` opts it into a
 * show-when-non-zero rule the runtime can honor.
 *
 * Mirrors the React component (components/stripe/CartBadge.tsx) which only
 * renders the pill when `showCount && count > 0`. Honors `conditionGroups`
 * via the walker, plus pass-through `attrs` and custom `handlers`.
 */
const cartBadgeToHTML: ToHTMLFn = (props, children, ctx) => {
  const attrs: Record<string, any> = {
    class: staticClasses(props, ctx) || "relative",
    style: getInlineStyle(props) || undefined,
    id: props.id || props.anchor || undefined,
    ...ariaAttrs(props),
    ...handlerAttrs(props),
  };
  if (props.attrs && typeof props.attrs === "object") {
    for (const [k, v] of Object.entries(props.attrs)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        attrs[k] = v as any;
      }
    }
  }
  // Default `relative` if no className resolved a positioning class (Box default).
  if (!attrs.class) attrs.class = "relative";
  ctx.classes.add("relative");

  const showCount = props.showCount !== false;
  let pill = "";
  if (showCount) {
    // Color via CSS vars (always emitted via design-system-vars) instead of
    // bg-primary/text-primary-content classes — Tailwind's scanner doesn't see
    // dynamically-added pill classes, so the .bg-primary rule wouldn't ship.
    // `hidden` must win at count=0 — keep display in a class (`flex`) not
    // inline (inline beats class on specificity).
    const pillClass = "hidden flex items-center justify-center absolute pointer-events-none";
    pillClass.split(" ").forEach(c => ctx.classes.add(c));
    const pillStyle =
      "top: -4px; right: -4px; min-width: 18px; height: 18px; border-radius: 9999px; font-size: 10px; font-weight: 700; background-color: var(--color-primary); color: var(--color-primary-content)";
    pill = tag(
      "span",
      {
        class: pillClass,
        style: pillStyle,
        "aria-label": "0 items in cart",
        "aria-live": "polite",
        "data-state-text": "cart:count",
        "data-state-show-when-truthy": "cart:count",
      },
      "0"
    );
  }

  return tag("div", attrs, `${children || ""}${pill}`);
};

export const defaultResolver: Record<string, ToHTMLFn> = {
  ...processForStatic(BUILTIN_COMPONENT_DEFS),
  Header: containerToHTML,
  Footer: containerToHTML,
  Data: dataToHTML,
  CartBadge: cartBadgeToHTML,
  CartDrawer: containerToHTML,
  CartItems: containerToHTML,
  CartSubtotal: containerToHTML,
  CheckoutBanner: containerToHTML,
  ProductDisplay: containerToHTML,
};
