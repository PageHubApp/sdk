/** Form — Component definition via defineComponent(). */
import React from "react";
import { TbForms } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { Form } from "./Form";
import { toHTML as containerToHTML } from "../Container/Container.craft";
import type { ToHTMLFn } from "../../utils/staticHtml";
import { formPresets } from "./Form.presets";

const HONEYPOT_HTML =
  '<div aria-hidden="true" style="position:absolute;left:-9999px;top:-9999px;opacity:0;height:0;overflow:hidden"><input type="text" name="_ph_hp" autocomplete="off" tabindex="-1"/></div>';

const toHTML: ToHTMLFn = (props, children, ctx) => {
  return containerToHTML({ ...props, type: "form" }, HONEYPOT_HTML + children, ctx);
};

const FormMainTab = React.lazy(() =>
  import("../../chrome/toolbar/inspector/mainTabs/FormMainTab").then(mod => ({
    default: mod.FormMainTab,
  }))
);

export const FormDef = defineComponent(
  {
    name: "Form",
    component: Form,
    icon: TbForms,
    category: "Forms",
    canvas: true,
    settings: FormMainTab,
    toHTML,
    disable: ["font", "opacity", "cursor", "hoverClick", "animations"],
    craftProps: {
      className: "flex flex-col items-center gap-container",
    },
    rules: {
      canDrag: () => true,
      canDelete: () => true,
      canMoveIn: nodes =>
        nodes.every(node => node.data?.type !== "Form" && node.data?.props?.type !== "form"),
    },
    tools: [],
    presets: formPresets,
  },
  { __internal: true }
);
