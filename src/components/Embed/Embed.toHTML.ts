import { staticClasses, tag, ariaAttrs, interpolate, type ToHTMLFn } from "../../utils/staticHtml";
import { resolveEmbedHTML } from "./Embed";

export const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const rawHtml = resolveEmbedHTML(props);
  // Resolve {{item.*}} against the current row so a Data repeater (e.g. a
  // "reels" collection) drives the embed in static export too — same
  // `interpolate` helper Image.toHTML uses.
  const html = rawHtml.includes("{{") ? interpolate(rawHtml, ctx) : rawHtml;

  if (!html) return "";
  const cls = staticClasses(props, ctx);
  return tag(
    "div",
    {
      class: cls || undefined,
      role: "region",
      "aria-label": props.title || "Embedded content",
      ...ariaAttrs(props),
    },
    html
  );
};
