/**
 * FormElement — Component definition via defineComponent()
 */
import { TbInputSearch } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { FormElement } from "./FormElement";
import { toHTML } from "./FormElement.toHTML";
import { lazyNamed } from "../../utils/lazyNamed";

export { toHTML };

const FormElementMainTab = lazyNamed(
  () => import("../../chrome/toolbar/inspector/mainTabs/FormElementMainTab"),
  "FormElementMainTab",
);
import { HoverNodeController, NameNodeController } from "../../chrome/editor-chrome";

export const FormElementDef = defineComponent(
  {
    name: "FormElement",
    displayName: "Form Item",
    description: "A single form field — text, email, dropdown, checkbox, etc.",
    component: FormElement,
    icon: TbInputSearch,
    category: "Forms",
    settings: FormElementMainTab,
    toHTML,
    disable: ["shadow", "radius", "opacity", "font", "pattern", "hoverClick", "animations"],
    rules: {
      canDrag: () => true,
      canMoveIn: () => false,
    },
    tools: props => [
      <NameNodeController
        key="formElementNameController"
        position="top"
        align="end"
        placement="end"
      />,
    ],
  },
  { __internal: true }
);
