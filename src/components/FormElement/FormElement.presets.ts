/** FormElement — toolbox presets. */
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
import type { ComponentPreset } from "../../define/types";
import { registerPresets } from "../../define/catalogRegistry";

const base = {
  className:
    "p-(--input-padding) w-full border-solid border-(length:--border) border-(--input-border-color) rounded-field bg-(--input-bg-color) text-(--input-text-color) :text-[color:var(--input-placeholder-color)] focus:ring-(length:--input-focus-ring) focus:ring-(--input-focus-ring-color) focus:outline-none",
};

export const formElementPresets: ComponentPreset[] = [
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
        "w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-(--input-bg-color) file:px-space-sm file:py-space-xs file:text-sm file:font-medium",
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

registerPresets("FormElement", formElementPresets);
