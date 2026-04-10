/**
 * Button — Component definition via defineComponent()
 */
import { LuImage } from "react-icons/lu";
import { RxButton } from "react-icons/rx";
import { ButtonMainTab, ButtonMainTabAdvanced } from "../chrome/Toolbar/UnifiedSettings/mainTabs/ButtonMainTab";
import { defineComponent } from "../define";
import { migrateAction, actionToHref, actionTarget } from "../utils/action";
import {
  PH_GOOGLE_ICON_DATA_ATTR,
  PH_MS_FONT_PENDING_CLASS,
} from "../utils/materialSymbolsReveal";
import { ariaAttrs, collectClasses, escapeAttr, escapeHTML, staticClasses, tag, type ToHTMLFn } from "../utils/static-html";
import { Button } from "./Button";
import { DeleteNodeController, HoverNodeController, SelectButtonListTool } from "./editor-chrome";

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  let icon = props.icon;
  if (typeof icon === "string") icon = { value: icon, position: "left", size: "w-6 h-6", gap: "gap-2" };
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
  const action = migrateAction(props);
  const href = actionToHref(action);
  const target = actionTarget(action);
  const t = href ? "a" : "button";

  const attrs: Record<string, any> = { class: fullCls || undefined, ...ariaAttrs(props) };
  if (t === "a" && href) {
    attrs.href = href;
    if (target) attrs.target = target;
    if (/^https?:\/\//.test(href)) attrs.rel = "noopener noreferrer";
  } else {
    attrs.type = props.type || "button";
  }
  if (icon?.only && !attrs["aria-label"]) attrs["aria-label"] = props.text || "Button";

  let iconHTML = "";
  if (icon?.value) {
    const isGoogle = icon.value.startsWith("ref-google:");
    if (isGoogle) {
      const name = icon.value.replace("ref-google:", "");
      const ic = [
        icon.size,
        icon.color || "fill-current",
        "flex items-center justify-center google-icons",
        PH_MS_FONT_PENDING_CLASS,
      ]
        .filter(Boolean)
        .join(" ");
      collectClasses(ic, ctx);
      iconHTML = `<span class="${escapeAttr(ic)}" ${PH_GOOGLE_ICON_DATA_ATTR}="1" aria-hidden="true">${escapeHTML(name)}</span>`;
    } else if (icon.value.startsWith("ref-")) {
      const ic = [icon.size, icon.color || "fill-current", "flex items-center justify-center"].filter(Boolean).join(" ");
      collectClasses(ic, ctx);
      iconHTML = `<span class="${escapeAttr(ic)}"></span>`;
    }
  }

  const textHTML = !icon?.only && props.text ? escapeHTML(props.text) : "";
  const before = icon?.position === "left" || icon?.position === "top";
  const inner = before ? iconHTML + textHTML : textHTML + iconHTML;

  return tag(t, attrs, inner);
};

export const ButtonDef = defineComponent({
  name: "Button",
  component: Button,
  icon: RxButton,
  category: "Basic",
  settings: ButtonMainTab,
  advancedSettings: ButtonMainTabAdvanced,
  toHTML,
  disable: ["opacity"],
  hoverClickVariant: "button",
  rules: {
    canDrag: () => true,
    canMoveIn: (nodes) => nodes.every(node => node.data?.name === "Button"),
  },
  tools: (props) => [
    <HoverNodeController
      key="buttonHoverController"
      position="top"
      align="end"
      placement="end"
      alt={{
        position: "bottom",
        align: "start",
        placement: "start",
      }}
    />,
    <SelectButtonListTool key="selectButtonList" />,
    <DeleteNodeController key="buttonDelete" />,
  ],
  presets: [
    {
      label: "Button",
      props: {
        text: "Button",
        className: "flex-row items-center justify-center gap-2 px-6 py-3 w-auto flex cursor-pointer border border-base-300 rounded-lg",
      },
    },
    {
      label: "Icon",
      icon: LuImage,
      props: {
        text: "Icon",
        icon: {
          value: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/></svg>`,
          only: true,
        },
        className: "flex-row items-center justify-center gap-2 px-6 py-3 w-auto flex cursor-pointer",
      },
    },
  ],
  modifiers: [
    // Composite patterns — canonical CTA buttons with spatial tokens + consistent height
    { name: "cta-responsive", label: "CTA Responsive", category: "Pattern", requires: "btn btn-primary", expands: "rounded-box px-space-md py-space-xs min-h-12 font-semibold w-full md:w-auto" },
    { name: "cta-outline-responsive", label: "CTA Outline", category: "Pattern", requires: "btn btn-outline", expands: "rounded-box px-space-md py-space-xs min-h-12 font-semibold border-base-content/30 text-base-content w-full md:w-auto" },
    // DaisyUI color variants
    { name: "btn-primary", label: "Primary", category: "Color", exclusive: true, requires: "btn", removes: ["bg-(--*", "text-(--*", "bg-transparent"] },
    { name: "btn-secondary", label: "Secondary", category: "Color", exclusive: true, requires: "btn", removes: ["bg-(--*", "text-(--*", "bg-transparent"] },
    { name: "btn-accent", label: "Accent", category: "Color", exclusive: true, requires: "btn", removes: ["bg-(--*", "text-(--*", "bg-transparent"] },
    { name: "btn-neutral", label: "Neutral", category: "Color", exclusive: true, requires: "btn", removes: ["bg-(--*", "text-(--*", "bg-transparent"] },
    { name: "btn-info", label: "Info", category: "Color", exclusive: true, requires: "btn", removes: ["bg-(--*", "text-(--*", "bg-transparent"] },
    { name: "btn-success", label: "Success", category: "Color", exclusive: true, requires: "btn", removes: ["bg-(--*", "text-(--*", "bg-transparent"] },
    { name: "btn-warning", label: "Warning", category: "Color", exclusive: true, requires: "btn", removes: ["bg-(--*", "text-(--*", "bg-transparent"] },
    { name: "btn-error", label: "Error", category: "Color", exclusive: true, requires: "btn", removes: ["bg-(--*", "text-(--*", "bg-transparent"] },
    // DaisyUI style variants
    { name: "btn-outline", label: "Outline", category: "Style", requires: "btn", removes: ["bg-(--*", "text-(--*", "bg-transparent", "border*"] },
    { name: "btn-ghost", label: "Ghost", category: "Style", requires: "btn", removes: ["bg-(--*", "text-(--*", "bg-transparent", "border*"] },
    { name: "btn-link", label: "Link", category: "Style", requires: "btn", removes: ["bg-(--*", "text-(--*", "bg-transparent", "border*"] },
    { name: "btn-soft", label: "Soft", category: "Style", requires: "btn", removes: ["bg-(--*", "text-(--*", "bg-transparent", "border*"] },
    { name: "btn-dash", label: "Dash", category: "Style", requires: "btn", removes: ["bg-(--*", "text-(--*", "bg-transparent", "border*"] },
    // DaisyUI size variants
    { name: "btn-xs", label: "Tiny", category: "Size", exclusive: true, requires: "btn" },
    { name: "btn-sm", label: "Small", category: "Size", exclusive: true, requires: "btn" },
    { name: "btn-md", label: "Medium", category: "Size", exclusive: true, requires: "btn" },
    { name: "btn-lg", label: "Large", category: "Size", exclusive: true, requires: "btn" },
    { name: "btn-xl", label: "XL", category: "Size", exclusive: true, requires: "btn" },
    { name: "btn-wide", label: "Wide", category: "Size", exclusive: true, requires: "btn" },
    { name: "btn-block", label: "Full Width", category: "Size", exclusive: true, requires: "btn" },
    // DaisyUI shape variants
    { name: "btn-circle", label: "Circle", category: "Shape", exclusive: true, requires: "btn" },
    { name: "btn-square", label: "Square", category: "Shape", exclusive: true, requires: "btn" },
    // State
    { name: "btn-disabled", label: "Disabled", category: "State", requires: "btn" },
    { name: "loading", label: "Loading", category: "State", requires: "btn" },
  ],
}, { __internal: true });
