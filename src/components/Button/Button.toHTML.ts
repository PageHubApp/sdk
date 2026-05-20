import { actionToHref, actionTarget, findLinkAction, migrateActions } from "../../utils/action";
import { pickIconSvgClass, serializeIconSvgAttrs } from "../../utils/icons/iconResolver";
import { resolveIconSvgSync } from "../../utils/icons/serverResolve";
import {
  actionsAttr,
  ariaAttrs,
  collectClasses,
  escapeAttr,
  getPageIndex,
  handlerAttrs,
  interpolate,
  stateAttrs,
  staticClasses,
  tag,
  type ToHTMLFn,
} from "../../utils/staticHtml";

export const toHTML: ToHTMLFn = (props, _children, ctx) => {
  let icon = props.icon;
  if (typeof icon === "string")
    icon = { value: icon, position: "left", size: "w-6 h-6", gap: "gap-2" };
  icon = { position: "left", size: "w-6 h-6", gap: "gap-2", ...icon };

  const cls = staticClasses(props, ctx);

  let extra = "";
  if (icon?.value) {
    const isVert = icon.position === "top" || icon.position === "bottom";
    extra = [
      "flex",
      isVert ? "flex-col" : "flex-row",
      "items-center",
      "justify-center",
      icon.gap || "gap-2",
    ].join(" ");
    collectClasses(extra, ctx);
  }

  const fullCls = [cls, extra].filter(Boolean).join(" ");
  // First link stays on `<a href>` for SEO + no-JS fallback. The full
  // action chain ALSO ships as `data-ph-actions` so the vanilla runtime
  // dispatches every entry in click order — matches Button.body's behavior
  // on hydrated routes.
  const actions = migrateActions(props);
  const firstLink = findLinkAction(actions);
  const rawHref = actionToHref(firstLink, getPageIndex(ctx), ctx?.currentPath);
  const href = rawHref ? interpolate(rawHref, ctx) : rawHref;
  const target = actionTarget(firstLink);
  const t = href ? "a" : "button";

  const attrs: Record<string, any> = {
    class: fullCls || undefined,
    ...ariaAttrs(props),
    ...handlerAttrs(props),
    ...actionsAttr(props, ctx),
    ...stateAttrs(props, ctx),
  };
  if (t === "a" && href) {
    attrs.href = href;
    if (target) attrs.target = target;
    if (/^https?:\/\//.test(href)) attrs.rel = "noopener noreferrer";
  } else {
    attrs.type = props.type || "button";
  }
  if (props.attrs && typeof props.attrs === "object") {
    for (const [k, v] of Object.entries(props.attrs)) {
      if (typeof v === "string") {
        attrs[k] = interpolate(v, ctx);
      } else if (typeof v === "number" || typeof v === "boolean") {
        attrs[k] = v as any;
      }
    }
  }
  if (icon?.only && !attrs["aria-label"]) attrs["aria-label"] = interpolate(props.text || "Button", ctx);

  let iconHTML = "";
  if (icon?.value && icon.value.startsWith("ref-icon:")) {
    const entry = resolveIconSvgSync(icon.value);
    if (entry) {
      const ic = [icon.size, icon.color || "fill-current", "flex items-center justify-center"]
        .filter(Boolean)
        .join(" ");
      collectClasses(ic, ctx);
      const iconSvgCls = pickIconSvgClass(ic);
      const svgAttrs = serializeIconSvgAttrs(entry.attrs);
      iconHTML = `<span class="${escapeAttr(ic)}" aria-hidden="true"><svg ${svgAttrs} viewBox="${entry.viewBox}" xmlns="http://www.w3.org/2000/svg" class="${iconSvgCls}">${entry.svg}</svg></span>`;
    }
  }

  // Persisted label HTML like Text.craft (variable spans, TipTap); escaping breaks static previews.
  const textHTML = !icon?.only && props.text ? interpolate(String(props.text), ctx) : "";
  const before = icon?.position === "left" || icon?.position === "top";
  const inner = before ? iconHTML + textHTML : textHTML + iconHTML;

  return tag(t, attrs, inner);
};
