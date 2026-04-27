/**
 * Divider — Component definition via defineComponent()
 *
 * Toolbox tiles come from BUILTIN_COMPONENT_DEFS + buildCustomToolboxEntries
 * (see ComponentSettings). One definition drives editor + static HTML.
 */
import { TbMinus } from "react-icons/tb";
import { defineComponent } from "../define";
import { Divider } from "./Divider";
import { staticClasses, buildAttrs, ariaAttrs, type ToHTMLFn } from "../utils/static-html";

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const cls = staticClasses(props, ctx);
  return `<hr${buildAttrs({ class: cls || undefined, ...ariaAttrs(props) })} />`;
};
import { DividerMainTab } from "../chrome/toolbar/unified-settings/mainTabs/DividerMainTab";

export const DividerDef = defineComponent(
  {
    name: "Divider",
    component: Divider,
    icon: TbMinus,
    category: "Content",
    settings: DividerMainTab,
    toHTML,
    disable: [
      "textColor",
      "bgColor",
      "background",
      "pattern",
      "font",
      "border",
      "opacity",
      "hoverClick",
      "animations",
      "alignment",
    ],
    presets: [
      {
        label: "Line Divider",
        description: "Horizontal rule to separate content.",
        props: {
          className: "h-2 my-space-xs w-full bg-accent border-0",
        },
      },
    ],
  },
  { __internal: true }
);
