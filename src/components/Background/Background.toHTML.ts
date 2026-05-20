import { staticClasses, getInlineStyle, tag, ariaAttrs, handlerAttrs, type ToHTMLFn } from "../../utils/staticHtml";
import { resolveTheme } from "../../utils/design/resolveTheme";

export const toHTML: ToHTMLFn = (props, children, ctx) => {
  const bgCtx = { ...ctx, palette: resolveTheme(props).palette };
  return tag(
    "main",
    {
      class: staticClasses(props, bgCtx) || undefined,
      style: getInlineStyle(props) || undefined,
      ...ariaAttrs(props),
      ...handlerAttrs(props),
    },
    children
  );
};
