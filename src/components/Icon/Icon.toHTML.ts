import { resolveIconSvgSync } from "../../utils/icons/serverResolve";
import { pickIconSvgClass, serializeIconSvgAttrs } from "../../utils/icons/iconResolver";
import {
  ariaAttrs,
  collectClasses,
  escapeAttr,
  handlerAttrs,
  staticClasses,
  tag,
  type ToHTMLFn,
} from "../../utils/staticHtml";

export const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const value: string | undefined = props.value;
  const color = props.color || "fill-current";
  const wrapCls = [
    color,
    "inline-flex",
    "items-center",
    "justify-center",
    staticClasses(props, ctx),
  ]
    .filter(Boolean)
    .join(" ");
  collectClasses(wrapCls, ctx);

  const aria = ariaAttrs(props);
  const hasLabel = typeof aria["aria-label"] === "string" && aria["aria-label"].length > 0;

  const attrs: Record<string, any> = {
    class: wrapCls || undefined,
    ...aria,
    ...handlerAttrs(props),
  };
  if (hasLabel) {
    attrs.role = "img";
  } else {
    attrs["aria-hidden"] = "true";
  }

  let inner = "";
  if (value && typeof value === "string" && value.startsWith("ref-icon:")) {
    const entry = resolveIconSvgSync(value);
    if (entry) {
      const svgCls = pickIconSvgClass(wrapCls);
      const svgAttrs = serializeIconSvgAttrs(entry.attrs);
      inner = `<svg ${svgAttrs} viewBox="${escapeAttr(entry.viewBox)}" xmlns="http://www.w3.org/2000/svg" class="${svgCls}">${entry.svg}</svg>`;
    }
  }
  // ref-image: static export relies on runtime media resolution — skipped here, matching Button.craft toHTML parity.

  return tag("span", attrs, inner);
};
