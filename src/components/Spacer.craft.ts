/**
 * Spacer — Component definition via defineComponent()
 */
import { defineComponent } from "../define";
import { Spacer } from "./Spacer";
import { staticClasses, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  return tag("div", {
    class: staticClasses(props, ctx) || undefined,
    "aria-hidden": "true",
    ...ariaAttrs(props),
  });
};
import { SpacerMainTab } from "../chrome/Toolbar/UnifiedSettings/mainTabs/SpacerMainTab";

export const SpacerDef = defineComponent({
  name: "Spacer",
  component: Spacer,
  icon: "TbSpace",
  category: "Basic",
  settings: SpacerMainTab,
  toHTML,
  disable: [
    "textColor", "border", "shadow", "radius",
    "font", "pattern", "opacity", "animations", "hoverClick",
  ],
  presets: [
    { label: "Spacer", props: {} },
  ],
}, { __internal: true });
