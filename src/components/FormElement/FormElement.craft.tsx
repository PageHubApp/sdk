/**
 * FormElement — Component definition via defineComponent()
 */
import React from "react";
import { TbInputSearch } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { FormElement } from "./FormElement";
import { staticClasses, tag, escapeHTML, ariaAttrs, type ToHTMLFn } from "../../utils/staticHtml";

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const cls = staticClasses(props, ctx);
  const t = props.type === "textarea" ? "textarea" : props.type === "select" ? "select" : "input";

  const attrs: Record<string, any> = {
    class: cls || undefined,
    type: t === "input" ? props.type || "text" : undefined,
    name: props.name || undefined,
    placeholder: props.placeholder || undefined,
    required: props.required || undefined,
    disabled: props.disabled || undefined,
    "aria-label": props.label || props.placeholder || props.name || `${props.type || "text"} input`,
    ...ariaAttrs(props),
  };
  if (t === "textarea" && props.rows) attrs.rows = String(props.rows);

  let inner = "";
  if (t === "select" && props.options?.length) {
    inner = props.options
      .map(
        (o: any) =>
          `<option value="${o.value}"${o.disabled ? " disabled" : ""}>${escapeHTML(o.label)}</option>`
      )
      .join("");
  }

  const input = tag(t, attrs, inner);

  if (props.label) {
    const label = `<label class="block text-sm font-medium mb-1">${escapeHTML(props.label)}${props.required ? ' <span aria-hidden="true">*</span>' : ""}</label>`;
    return tag("div", { style: "width: 100%" }, label + input);
  }
  return input;
};
const FormElementMainTab = React.lazy(() =>
  import("../../chrome/toolbar/inspector/mainTabs/FormElementMainTab").then(mod => ({
    default: mod.FormElementMainTab,
  }))
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
