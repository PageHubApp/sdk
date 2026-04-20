/**
 * Button — Component definition via defineComponent()
 */
import { RxButton } from "react-icons/rx";
import {
  ButtonMainTab,
  ButtonMainTabAdvanced,
} from "../chrome/toolbar/unified-settings/mainTabs/ButtonMainTab";
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
  const action = migrateAction(props);
  const href = actionToHref(action);
  const target = actionTarget(action);
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

  const textHTML = !icon?.only && props.text ? escapeHTML(props.text) : "";
  const before = icon?.position === "left" || icon?.position === "top";
  const inner = before ? iconHTML + textHTML : textHTML + iconHTML;

  return tag(t, attrs, inner);
};

export const ButtonDef = defineComponent(
  {
    name: "Button",
    component: Button,
    icon: RxButton,
    category: "Content",
    settings: ButtonMainTab,
    advancedSettings: ButtonMainTabAdvanced,
    toHTML,
    disable: ["opacity"],
    hoverClickVariant: "button",
    rules: {
      canDrag: () => true,
      canMoveIn: nodes => nodes.every(node => node.data?.name === "Button"),
    },
    presets: [
      {
        label: "Button",
        description: "Primary CTA button with spatial padding and theme colors.",
        props: {
          text: "Button",
          className:
            "btn btn-primary rounded-box px-space-md py-space-xs min-h-12 font-semibold self-start",
        },
      },
    ],
    modifiers: [
      // Composite patterns — canonical CTA buttons with spatial tokens + consistent height
      {
        name: "cta-responsive",
        label: "CTA Responsive",
        category: "Pattern",
        description:
          "Canonical primary CTA — spatial padding, 48px min height, full-width on mobile and auto-width on desktop",
        requires: "btn btn-primary",
        expands: "rounded-box px-space-md py-space-xs min-h-12 font-semibold w-full md:w-auto",
      },
      {
        name: "cta-outline-responsive",
        label: "CTA Outline",
        category: "Pattern",
        description:
          "Canonical outline CTA — matches CTA Responsive sizing with a base-content border and no fill",
        requires: "btn btn-outline",
        expands:
          "rounded-box px-space-md py-space-xs min-h-12 font-semibold border-base-content/30 text-base-content w-full md:w-auto",
      },
      // DaisyUI color variants
      {
        name: "btn-primary",
        label: "Primary",
        category: "Color",
        description: "Solid fill using the primary brand color",
        exclusive: true,
        requires: "btn",
        removes: ["bg-(--*", "text-(--*", "bg-transparent"],
      },
      {
        name: "btn-secondary",
        label: "Secondary",
        category: "Color",
        description: "Solid fill using the secondary brand color",
        exclusive: true,
        requires: "btn",
        removes: ["bg-(--*", "text-(--*", "bg-transparent"],
      },
      {
        name: "btn-accent",
        label: "Accent",
        category: "Color",
        description: "Solid fill using the accent color",
        exclusive: true,
        requires: "btn",
        removes: ["bg-(--*", "text-(--*", "bg-transparent"],
      },
      {
        name: "btn-neutral",
        label: "Neutral",
        category: "Color",
        description: "Solid fill using the neutral/dark color",
        exclusive: true,
        requires: "btn",
        removes: ["bg-(--*", "text-(--*", "bg-transparent"],
      },
      {
        name: "btn-info",
        label: "Info",
        category: "Color",
        description: "Solid fill using the info (blue) color",
        exclusive: true,
        requires: "btn",
        removes: ["bg-(--*", "text-(--*", "bg-transparent"],
      },
      {
        name: "btn-success",
        label: "Success",
        category: "Color",
        description: "Solid fill using the success (green) color",
        exclusive: true,
        requires: "btn",
        removes: ["bg-(--*", "text-(--*", "bg-transparent"],
      },
      {
        name: "btn-warning",
        label: "Warning",
        category: "Color",
        description: "Solid fill using the warning (yellow/orange) color",
        exclusive: true,
        requires: "btn",
        removes: ["bg-(--*", "text-(--*", "bg-transparent"],
      },
      {
        name: "btn-error",
        label: "Error",
        category: "Color",
        description: "Solid fill using the error (red) color",
        exclusive: true,
        requires: "btn",
        removes: ["bg-(--*", "text-(--*", "bg-transparent"],
      },
      // DaisyUI style variants
      {
        name: "btn-outline",
        label: "Outline",
        category: "Style",
        description: "Border only, no fill — color fills on hover",
        requires: "btn",
        removes: ["bg-(--*", "text-(--*", "bg-transparent", "border*"],
      },
      {
        name: "btn-ghost",
        label: "Ghost",
        category: "Style",
        description: "No border or fill — text-only, subtle appearance with hover state",
        requires: "btn",
        removes: ["bg-(--*", "text-(--*", "bg-transparent", "border*"],
      },
      {
        name: "btn-link",
        label: "Link",
        category: "Style",
        description: "Looks like a hyperlink with no button frame",
        requires: "btn",
        removes: ["bg-(--*", "text-(--*", "bg-transparent", "border*"],
      },
      {
        name: "btn-soft",
        label: "Soft",
        category: "Style",
        description: "Soft tinted fill at reduced opacity — gentler than solid",
        requires: "btn",
        removes: ["bg-(--*", "text-(--*", "bg-transparent", "border*"],
      },
      {
        name: "btn-dash",
        label: "Dash",
        category: "Style",
        description: "Dashed border instead of solid",
        requires: "btn",
        removes: ["bg-(--*", "text-(--*", "bg-transparent", "border*"],
      },
      // DaisyUI size variants
      { name: "btn-xs", label: "Tiny", category: "Size", exclusive: true, requires: "btn" },
      { name: "btn-sm", label: "Small", category: "Size", exclusive: true, requires: "btn" },
      { name: "btn-md", label: "Medium", category: "Size", exclusive: true, requires: "btn" },
      { name: "btn-lg", label: "Large", category: "Size", exclusive: true, requires: "btn" },
      { name: "btn-xl", label: "XL", category: "Size", exclusive: true, requires: "btn" },
      {
        name: "btn-wide",
        label: "Wide",
        category: "Size",
        description: "Fixed wide width — good for consistent button widths in a row",
        exclusive: true,
        requires: "btn",
      },
      {
        name: "btn-block",
        label: "Full Width",
        category: "Size",
        description: "Stretches to fill its parent container",
        exclusive: true,
        requires: "btn",
      },
      // DaisyUI shape variants
      {
        name: "btn-circle",
        label: "Circle",
        category: "Shape",
        description: "Circular shape — best for icon-only buttons",
        exclusive: true,
        requires: "btn",
      },
      {
        name: "btn-square",
        label: "Square",
        category: "Shape",
        description: "Square shape — best for icon-only buttons",
        exclusive: true,
        requires: "btn",
      },
      // State
      {
        name: "btn-disabled",
        label: "Disabled",
        category: "State",
        description: "Visually muted and non-interactive",
        requires: "btn",
        peerInherit: false,
      },
      {
        name: "loading",
        label: "Loading",
        category: "State",
        description: "Shows a loading spinner inside the button",
        requires: "btn",
        peerInherit: false,
      },
    ],
    peerInherit: {
      whenParentIs: ["ButtonList"],
      reference: "left-neighbor",
    },
  },
  { __internal: true }
);
