/**
 * Divider — Component definition via defineComponent()
 *
 * This replaces the separate Divider.craft.tsx file and the toolbox
 * entry in dividerComponents.tsx. One definition drives everything.
 */
import { TbMinus } from "react-icons/tb";
import { defineComponent } from "../define";
import { Divider } from "./Divider";
import { staticClasses, buildAttrs, ariaAttrs, type ToHTMLFn } from "../utils/static-html";

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const cls = staticClasses(props, ctx);
  return `<hr${buildAttrs({ class: cls || undefined, ...ariaAttrs(props) })} />`;
};
import { DividerMainTab } from "../chrome/Toolbar/UnifiedSettings/mainTabs/DividerMainTab";

export const DividerDef = defineComponent({
  name: "Divider",
  component: Divider,
  icon: TbMinus,
  category: "Basic",
  settings: DividerMainTab,
  toHTML,
  disable: [
    "textColor", "bgColor", "background", "pattern",
    "font", "border", "opacity", "hoverClick", "animations",
  ],
  presets: [
    {
      label: "Line Divider",
      props: {
        className: "h-2 my-3 w-full bg-accent border-0",
      },
    },
  ],
}, { __internal: true });
