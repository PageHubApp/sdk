/** FormElement — modifiers extracted from FormElement.craft.tsx. */
import type { ComponentModifier } from "../../define/types";
import { registerModifiers } from "../../define/catalogRegistry";

export const formElementModifiers: ComponentModifier[] = [
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
];

registerModifiers("FormElement", formElementModifiers);
