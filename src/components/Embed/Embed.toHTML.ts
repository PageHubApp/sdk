import { staticClasses, tag, ariaAttrs, type ToHTMLFn } from "../../utils/staticHtml";
import { resolveEmbedHTML } from "./Embed";

export const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const html = resolveEmbedHTML(props);

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
