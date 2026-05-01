import React from "react";
/**
 * Button — Component definition via defineComponent()
 */
import { TbHandClick } from "react-icons/tb";
const ButtonMainTab = React.lazy(() =>
  import("../../chrome/toolbar/inspector/mainTabs/ButtonMainTab").then(mod => ({
    default: mod.ButtonMainTab,
  }))
);
import { defineComponent } from "../../define/defineComponent";
import { migrateActions, actionToHref, actionTarget, findLinkAction } from "../../utils/action";
import { resolveIconSvgSync } from "../../utils/icons/serverResolve";
import {
  ariaAttrs,
  collectClasses,
  escapeAttr,
  handlerAttrs,
  staticClasses,
  tag,
  type ToHTMLFn,
} from "../../utils/staticHtml";
import { Button } from "./Button";

const toHTML: ToHTMLFn = (props, _children, ctx) => {
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
  // Static export carries no JS runtime — multi-action chains can't fire.
  // Render the first link's href on `<a>` (preserves SEO + right-click) and
  // accept the chain-fidelity loss; in-app SSR (/view, /static, custom
  // domains) hydrate React and dispatch the full chain via Button.tsx.
  const firstLink = findLinkAction(migrateActions(props));
  const href = actionToHref(firstLink);
  const target = actionTarget(firstLink);
  const t = href ? "a" : "button";

  const attrs: Record<string, any> = {
    class: fullCls || undefined,
    ...ariaAttrs(props),
    ...handlerAttrs(props),
  };
  if (t === "a" && href) {
    attrs.href = href;
    if (target) attrs.target = target;
    if (/^https?:\/\//.test(href)) attrs.rel = "noopener noreferrer";
  } else {
    attrs.type = props.type || "button";
  }
  if (icon?.only && !attrs["aria-label"]) attrs["aria-label"] = props.text || "Button";

  let iconHTML = "";
  if (icon?.value && icon.value.startsWith("ref-icon:")) {
    const entry = resolveIconSvgSync(icon.value);
    if (entry) {
      const ic = [icon.size, icon.color || "fill-current", "flex items-center justify-center"]
        .filter(Boolean)
        .join(" ");
      collectClasses(ic, ctx);
      iconHTML = `<span class="${escapeAttr(ic)}" aria-hidden="true"><svg fill="currentColor" viewBox="${entry.viewBox}" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${entry.svg}</svg></span>`;
    }
  }

  // Persisted label HTML like Text.craft (variable spans, TipTap); escaping breaks static previews.
  const textHTML = !icon?.only && props.text ? String(props.text) : "";
  const before = icon?.position === "left" || icon?.position === "top";
  const inner = before ? iconHTML + textHTML : textHTML + iconHTML;

  return tag(t, attrs, inner);
};

export const ButtonDef = defineComponent(
  {
    name: "Button",
    component: Button,
    icon: TbHandClick,
    category: "Buttons",
    settings: ButtonMainTab,
    toHTML,
    disable: ["opacity"],
    hoverClickVariant: "button",
    rules: {
      canDrag: () => true,
      canMoveIn: nodes => nodes.every(node => node.data?.name === "Button"),
    },
    peerInherit: {
      whenParentIs: ["Container"],
      reference: "left-neighbor",
    },
  },
  { __internal: true }
);
