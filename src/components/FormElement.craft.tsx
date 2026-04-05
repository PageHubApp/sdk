/**
 * FormElement — Component definition via defineComponent()
 */
import React from "react";
import { defineComponent } from "../define";
import { FormElement } from "./FormElement";
import { staticClasses, tag, escapeHTML, ariaAttrs, type ToHTMLFn } from "../utils/static-html";

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const cls = staticClasses(props, ctx);
  const t = props.type === "textarea" ? "textarea" : props.type === "select" ? "select" : "input";

  const attrs: Record<string, any> = {
    class: cls || undefined,
    type: t === "input" ? (props.type || "text") : undefined,
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
    inner = props.options.map((o: any) =>
      `<option value="${o.value}"${o.disabled ? " disabled" : ""}>${escapeHTML(o.label)}</option>`
    ).join("");
  }

  const input = tag(t, attrs, inner);

  if (props.label) {
    const label = `<label class="block text-sm font-medium mb-1">${escapeHTML(props.label)}${props.required ? ' <span aria-hidden="true">*</span>' : ""}</label>`;
    return tag("div", { style: "width: 100%" }, label + input);
  }
  return input;
};
import { FormElementMainTab } from "../chrome/Toolbar/UnifiedSettings/mainTabs/FormElementMainTab";
import { HoverNodeController, NameNodeController } from "./editor-chrome";

export const FormElementDef = defineComponent({
  name: "FormElement",
  displayName: "Form Item",
  component: FormElement,
  icon: "TbInputSearch",
  category: "Forms",
  settings: FormElementMainTab,
  toHTML,
  disable: [
    "shadow", "radius", "opacity", "font",
    "pattern", "hoverClick", "animations",
  ],
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
  tools: (props) => [
    <NameNodeController
      key="formElementNameController"
      position="top"
      align="end"
      placement="end"
    />,
    <HoverNodeController
      key="formElementHoverController"
      position="top"
      align="start"
      placement="end"
      alt={{
        position: "bottom",
        align: "start",
        placement: "start",
      }}
    />,
  ],
  presets: (() => {
    const base = {
      className: "p-(--input-padding) w-full border border-(--input-border-width) border-solid border-(--input-border-color) rounded-(--input-border-radius) bg-(--input-bg-color) text-(--input-text-color) :text-[color:var(--input-placeholder-color)] focus:ring-(--input-focus-ring) focus:ring-(--input-focus-ring-color) focus:outline-none",
    };
    return [
      { label: "Textarea",  icon: "TbTextCaption",  props: { type: "textarea", placeholder: "Enter your message...", name: "message", ...base } },
      { label: "Input",     icon: "TbInputSearch",  props: { type: "text",     placeholder: "Enter text...",           name: "text",    ...base } },
      { label: "Email",     icon: "TbAt",           props: { type: "email",    placeholder: "your@email.com",         name: "email",   ...base } },
      { label: "Select",    icon: "TbChevronDown",  props: { type: "select",   placeholder: "Choose an option...",    name: "select",  ...base } },
    ];
  })(),
}, { __internal: true });
