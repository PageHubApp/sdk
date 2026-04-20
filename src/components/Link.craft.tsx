/**
 * Link — Text-styled hyperlink. Sibling of Button; always renders <a>, supports
 * only link-oriented actions (link-url, link-page, scroll-to, email, phone).
 */
import { TbLink } from "react-icons/tb";
import {
  LinkMainTab,
  LinkMainTabAdvanced,
} from "../chrome/toolbar/unified-settings/mainTabs/LinkMainTab";
import { defineComponent } from "../define";
import { migrateAction, actionToHref, actionTarget } from "../utils/action";
import { resolveIconSvgSync } from "../utils/icons/serverResolve";
import {
  ariaAttrs,
  collectClasses,
  escapeAttr,
  escapeHTML,
  handlerAttrs,
  staticClasses,
  tag,
  type ToHTMLFn,
} from "../utils/static-html";
import { Link } from "./Link";

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  let icon = props.icon;
  if (typeof icon === "string")
    icon = { value: icon, position: "left", size: "w-4 h-4", gap: "gap-1.5" };
  icon = { position: "left", size: "w-4 h-4", gap: "gap-1.5", ...icon };

  const cls = staticClasses(props, ctx);

  let extra = "";
  if (icon?.value) {
    const isVert = icon.position === "top" || icon.position === "bottom";
    extra = [
      "inline-flex",
      isVert ? "flex-col" : "flex-row",
      "items-center",
      icon.gap || "gap-1.5",
    ].join(" ");
    collectClasses(extra, ctx);
  }

  const fullCls = [cls, extra].filter(Boolean).join(" ");
  const action = migrateAction(props);
  const href = actionToHref(action);
  const target = actionTarget(action);

  const attrs: Record<string, any> = {
    class: fullCls || undefined,
    ...ariaAttrs(props),
    ...handlerAttrs(props),
  };
  if (href) {
    attrs.href = href;
    if (target) attrs.target = target;
    if (/^https?:\/\//.test(href)) attrs.rel = "noopener noreferrer";
  }
  if (icon?.only && !attrs["aria-label"]) attrs["aria-label"] = props.text || "Link";

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

  const textHTML = !icon?.only && props.text ? escapeHTML(props.text) : "";
  const before = icon?.position === "left" || icon?.position === "top";
  const inner = before ? iconHTML + textHTML : textHTML + iconHTML;

  return tag("a", attrs, inner);
};

export const LinkDef = defineComponent(
  {
    name: "Link",
    component: Link,
    icon: TbLink,
    category: "Content",
    settings: LinkMainTab,
    advancedSettings: LinkMainTabAdvanced,
    toHTML,
    disable: ["opacity"],
    rules: {
      canDrag: () => true,
    },
    presets: [
      {
        label: "Link",
        description: "Plain text hyperlink — underlines on hover, inherits parent color.",
        props: {
          text: "Learn more",
          className: "link link-hover",
        },
      },
      {
        label: "Arrow Link",
        description: "Text link with trailing arrow icon — common 'read more' pattern.",
        props: {
          text: "Read more",
          icon: {
            value: "ref-icon:tb/TbArrowRight",
            position: "right",
            size: "w-4 h-4",
          },
          className: "link link-hover",
        },
      },
    ],
    modifiers: [
      // DaisyUI link color variants
      {
        name: "link-primary",
        label: "Primary",
        category: "Color",
        description: "Primary brand color",
        exclusive: true,
        requires: "link",
      },
      {
        name: "link-secondary",
        label: "Secondary",
        category: "Color",
        description: "Secondary brand color",
        exclusive: true,
        requires: "link",
      },
      {
        name: "link-accent",
        label: "Accent",
        category: "Color",
        description: "Accent color",
        exclusive: true,
        requires: "link",
      },
      {
        name: "link-neutral",
        label: "Neutral",
        category: "Color",
        description: "Neutral color",
        exclusive: true,
        requires: "link",
      },
      {
        name: "link-info",
        label: "Info",
        category: "Color",
        exclusive: true,
        requires: "link",
      },
      {
        name: "link-success",
        label: "Success",
        category: "Color",
        exclusive: true,
        requires: "link",
      },
      {
        name: "link-warning",
        label: "Warning",
        category: "Color",
        exclusive: true,
        requires: "link",
      },
      {
        name: "link-error",
        label: "Error",
        category: "Color",
        exclusive: true,
        requires: "link",
      },
      // DaisyUI link style variants
      {
        name: "link-hover",
        label: "Underline on Hover",
        category: "Style",
        description: "Underline appears only on hover",
        requires: "link",
      },
    ],
  },
  { __internal: true },
);
