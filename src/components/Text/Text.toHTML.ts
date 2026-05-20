import { actionToHref, actionTarget, findLinkAction, migrateActions } from "../../utils/action";
import {
  actionsAttr,
  ariaAttrs,
  attrsPassthrough,
  getInlineStyle,
  getPageIndex,
  handlerAttrs,
  interpolate,
  stateAttrs,
  staticClasses,
  tag,
  type ToHTMLFn,
} from "../../utils/staticHtml";

// Guard against corrupted tagName data (e.g. `p, "text": "..."` from bad MCP writes)
const sanitizeTagName = (raw: unknown): string => {
  if (typeof raw !== "string") return "div";
  if (raw === "Textfit") return raw;
  const clean = raw.split(/[,\s]/)[0].toLowerCase();
  return /^[a-z][a-z0-9]*$/.test(clean) ? clean : "div";
};

export const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const cls = staticClasses(props, ctx);
  const style = getInlineStyle(props);
  const text = interpolate(props.text || "", ctx);
  const safeName = sanitizeTagName(props.tagName);

  const actions = migrateActions(props);
  const firstLink = findLinkAction(actions);
  const rawHref = actionToHref(firstLink, getPageIndex(ctx), ctx?.currentPath);
  const href = rawHref ? interpolate(rawHref, ctx) : rawHref;
  const target = actionTarget(firstLink);

  if (href) {
    const linkTag = tag(
      "a",
      {
        href,
        target: target || undefined,
        rel: /^https?:\/\//.test(href) ? "noopener noreferrer" : undefined,
      },
      text
    );
    // Wrap the <a> inside the original tagName so className and semantic structure are preserved
    return tag(
      safeName,
      {
        class: cls || undefined,
        style: style || undefined,
        ...ariaAttrs(props),
        ...handlerAttrs(props),
        ...actionsAttr(props, ctx),
        ...stateAttrs(props, ctx),
        ...attrsPassthrough(props),
      },
      linkTag
    );
  }

  if (props.tagName === "Textfit") {
    // AutoTextSize is JS-only — use a reasonable clamp for static HTML
    // Strip vw-based text-[] classes that blow up in scaled preview containers
    const fitCls = cls.replace(/text-\[clamp\([^\]]*vw[^\]]*\)\]/g, "").trim();
    // AutoTextSize is JS-only. Use cqw so text scales with the preview container
    // (ancestor needs container-type: inline-size — set on the preview wrapper).
    // Heuristic targets the live AutoTextSize behavior: shorter words get
    // proportionally larger fonts so they fill the width. Cap kept low because
    // Textfit nodes often live inside half-width columns — a single short word
    // at high cqw overflows the column and wraps mid-word.
    const plainText = text.replace(/<[^>]*>/g, "").trim();
    const charCount = plainText.length || 1;
    const cqw = Math.min(50 / charCount, 7).toFixed(1);
    const fitStyle = [style, `font-size: ${cqw}cqw; width: 100%`].filter(Boolean).join("; ");

    return tag(
      "div",
      {
        class: fitCls || undefined,
        style: fitStyle,
        ...ariaAttrs(props),
        ...handlerAttrs(props),
        ...actionsAttr(props, ctx),
        ...stateAttrs(props, ctx),
        ...attrsPassthrough(props),
      },
      text
    );
  }

  return tag(
    safeName,
    {
      class: cls || undefined,
      style: style || undefined,
      ...ariaAttrs(props),
      ...handlerAttrs(props),
      ...actionsAttr(props, ctx),
      ...stateAttrs(props, ctx),
      ...attrsPassthrough(props),
    },
    text
  );
};
