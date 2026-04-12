/**
 * FormElement — Component definition via defineComponent()
 */
import React from "react";
import {
  TbAdjustments,
  TbAt,
  TbCalendar,
  TbCheckbox,
  TbChevronDown,
  TbCircleDot,
  TbHash,
  TbInputSearch,
  TbTextCaption,
  TbUpload,
} from "react-icons/tb";
import { defineComponent } from "../define";
import { FormElement } from "./FormElement";
import { staticClasses, tag, escapeHTML, ariaAttrs, type ToHTMLFn } from "../utils/static-html";

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
import { FormElementMainTab } from "../chrome/Toolbar/UnifiedSettings/mainTabs/FormElementMainTab";
import { HoverNodeController, NameNodeController } from "./editor-chrome";

export const FormElementDef = defineComponent(
  {
    name: "FormElement",
    displayName: "Form Item",
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
        className:
          "p-(--input-padding) w-full border-solid border-(length:--border) border-(--input-border-color) rounded-field bg-(--input-bg-color) text-(--input-text-color) :text-[color:var(--input-placeholder-color)] focus:ring-(length:--input-focus-ring) focus:ring-(--input-focus-ring-color) focus:outline-none",
      };
      return [
        {
          label: "Textarea",
          icon: TbTextCaption,
          props: {
            type: "textarea",
            placeholder: "Enter your message...",
            name: "message",
            ...base,
          },
        },
        {
          label: "Input",
          icon: TbInputSearch,
          props: { type: "text", placeholder: "Enter text...", name: "text", ...base },
        },
        {
          label: "Email",
          icon: TbAt,
          props: { type: "email", placeholder: "your@email.com", name: "email", ...base },
        },
        {
          label: "Select",
          icon: TbChevronDown,
          props: { type: "select", placeholder: "Choose an option...", name: "select", ...base },
        },
        {
          label: "Checkbox",
          icon: TbCheckbox,
          props: {
            type: "checkbox",
            label: "I agree",
            name: "agree",
            className: "size-4 accent-(--input-focus-ring-color)",
          },
        },
        {
          label: "Radio",
          icon: TbCircleDot,
          props: {
            type: "radio",
            label: "Option",
            name: "choice",
            className: "size-4 accent-(--input-focus-ring-color)",
          },
        },
        {
          label: "Number",
          icon: TbHash,
          props: { type: "number", placeholder: "0", name: "number", ...base },
        },
        { label: "Date", icon: TbCalendar, props: { type: "date", name: "date", ...base } },
        {
          label: "File",
          icon: TbUpload,
          props: {
            type: "file",
            name: "file",
            className:
              "w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-(--input-bg-color) file:px-4 file:py-2 file:text-sm file:font-medium",
          },
        },
        {
          label: "Range",
          icon: TbAdjustments,
          props: {
            type: "range",
            name: "range",
            min: "0",
            max: "100",
            className: "w-full accent-(--input-focus-ring-color)",
          },
        },
      ];
    })(),
    modifiers: [
      // DaisyUI input variants
      {
        name: "input",
        label: "Input",
        category: "DaisyUI",
        description: "DaisyUI text input style — adds height, padding, border, and focus ring",
      },
      {
        name: "input-primary",
        label: "Primary",
        category: "DaisyUI",
        description: "Focus ring and border in the primary brand color",
        requires: "input",
      },
      {
        name: "input-secondary",
        label: "Secondary",
        category: "DaisyUI",
        description: "Focus ring and border in the secondary brand color",
        requires: "input",
      },
      {
        name: "input-accent",
        label: "Accent",
        category: "DaisyUI",
        description: "Focus ring and border in the accent color",
        requires: "input",
      },
      {
        name: "input-bordered",
        label: "Bordered",
        category: "DaisyUI",
        description: "Adds a visible border to the input field",
        requires: "input",
      },
      {
        name: "input-ghost",
        label: "Ghost",
        category: "DaisyUI",
        description: "Minimal input with no background or border — transparent until focused",
        requires: "input",
      },
      {
        name: "textarea",
        label: "Textarea",
        category: "DaisyUI",
        description: "DaisyUI textarea style — multi-line text input with matching design tokens",
      },
      {
        name: "select",
        label: "Select",
        category: "DaisyUI",
        description: "DaisyUI select dropdown style — styled drop-down with chevron",
      },
      {
        name: "checkbox",
        label: "Checkbox",
        category: "DaisyUI",
        description: "DaisyUI checkbox — styled tick-box input",
      },
      {
        name: "radio",
        label: "Radio",
        category: "DaisyUI",
        description: "DaisyUI radio button — styled single-select option",
      },
      {
        name: "toggle",
        label: "Toggle",
        category: "DaisyUI",
        description: "DaisyUI toggle switch — on/off slider style",
      },
      {
        name: "range",
        label: "Range",
        category: "DaisyUI",
        description: "DaisyUI range slider — styled horizontal drag input",
      },
      // Size
      { name: "input-xs", label: "XS", category: "Size", exclusive: true, requires: "input" },
      { name: "input-sm", label: "SM", category: "Size", exclusive: true, requires: "input" },
      { name: "input-md", label: "MD", category: "Size", exclusive: true, requires: "input" },
      { name: "input-lg", label: "LG", category: "Size", exclusive: true, requires: "input" },
    ],
  },
  { __internal: true }
);
