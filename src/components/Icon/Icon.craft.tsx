import React from "react";
/**
 * Icon — Standalone decorative/semantic icon. Renders inline SVG (react-icons) or
 * a media-library image. No actions — if clickable is needed, wrap in Container/Button.
 */
import { TbBolt, TbIcons, TbStarFilled } from "react-icons/tb";
const IconMainTab = React.lazy(() =>
  import("../../chrome/toolbar/inspector/mainTabs/IconMainTab").then(mod => ({
    default: mod.IconMainTab,
  }))
);
import { defineComponent } from "../../define/defineComponent";
import { resolveIconSvgSync } from "../../utils/icons/serverResolve";
import {
  ariaAttrs,
  collectClasses,
  escapeAttr,
  staticClasses,
  tag,
  type ToHTMLFn,
} from "../../utils/staticHtml";
import { Icon } from "./Icon";
import { iconPresets } from "./Icon.presets";

const toHTML: ToHTMLFn = (props, _children, ctx) => {
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
      inner = `<svg fill="currentColor" viewBox="${escapeAttr(entry.viewBox)}" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${entry.svg}</svg>`;
    }
  }
  // ref-image: static export relies on runtime media resolution — skipped here, matching Button.craft toHTML parity.

  return tag("span", attrs, inner);
};

export const IconDef = defineComponent(
  {
    name: "Icon",
    component: Icon,
    icon: TbIcons,
    category: "Icons",
    settings: IconMainTab,
    toHTML,
    disable: ["opacity"],
    rules: {
      canDrag: () => true,
    },
    presets: iconPresets,
  },
  { __internal: true }
);
