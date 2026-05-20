/** Form — Component definition via defineComponent(). */
import { TbForms } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { Form } from "./Form";
import { toHTML } from "./Form.toHTML";
import { lazyNamed } from "../../utils/lazyNamed";

export { toHTML };

const FormMainTab = lazyNamed(
  () => import("../../chrome/toolbar/inspector/mainTabs/FormMainTab"),
  "FormMainTab",
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
  },
  { __internal: true }
);
