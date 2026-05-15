/**
 * FormElement — Component definition via defineComponent()
 */
import React from "react";
import { TbInputSearch } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { FormElement } from "./FormElement";
import {
  ariaAttrs,
  escapeHTML,
  handlerAttrs,
  interpolate,
  stateAttrs,
  staticClasses,
  tag,
  type ToHTMLFn,
} from "../../utils/staticHtml";

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const cls = staticClasses(props, ctx);
  const t = props.type === "textarea" ? "textarea" : props.type === "select" ? "select" : "input";

  // SSR-seeded default for `stateBinding.key`. Without a request-query
  // surface in the walker we only emit a defaultValue when the binding
  // carries one explicitly; the runtime fills the live value post-hydration.
  let seededDefault: string | undefined;
  const sb = props.stateBinding;
  if (sb && typeof sb === "object" && typeof sb.key === "string") {
    if (typeof sb.defaultValue === "string" && sb.defaultValue) {
      seededDefault = sb.defaultValue;
    }
  }

  const attrs: Record<string, any> = {
    class: cls || undefined,
    type: t === "input" ? props.type || "text" : undefined,
    name: props.name || undefined,
    placeholder: props.placeholder ? interpolate(props.placeholder, ctx) : undefined,
    value: t === "input" && seededDefault !== undefined ? seededDefault : undefined,
    required: props.required || undefined,
    disabled: props.disabled || undefined,
    "aria-label": interpolate(
      props.label || props.placeholder || props.name || `${props.type || "text"} input`,
      ctx
    ),
    ...ariaAttrs(props),
    ...handlerAttrs(props),
    ...stateAttrs(props, ctx),
  };
  if (t === "textarea" && props.rows) attrs.rows = String(props.rows);

  let inner = "";
  if (t === "select" && props.options?.length) {
    inner = props.options
      .map(
        (o: any) =>
          `<option value="${o.value}"${o.disabled ? " disabled" : ""}${seededDefault !== undefined && String(o.value) === seededDefault ? " selected" : ""}>${escapeHTML(o.label)}</option>`
      )
      .join("");
  } else if (t === "textarea" && seededDefault !== undefined) {
    inner = escapeHTML(seededDefault);
  }

  const input = tag(t, attrs, inner);

  if (props.label) {
    const label = `<label class="block text-sm font-medium mb-1">${escapeHTML(interpolate(props.label, ctx))}${props.required ? ' <span aria-hidden="true">*</span>' : ""}</label>`;
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
