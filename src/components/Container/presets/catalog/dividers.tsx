/** Container catalog — divider presets (Spacer, Divider). */
import { TbMinus, TbSpace } from "react-icons/tb";
import type { ComponentPreset } from "../../../../define/types";

export const dividerPresets: ComponentPreset[] = [
  {
    label: "Spacer",
    description: "An empty gap that pushes things apart.",
    icon: TbSpace,
    category: "Dividers",
    props: {
      className: "h-16 w-full bg-transparent",
      attrs: { "aria-hidden": "true" },
    },
  },
  {
    label: "Divider",
    description: "A thin line between sections.",
    icon: TbMinus,
    category: "Dividers",
    props: {
      className: "border-t w-full",
      attrs: { role: "separator" },
    },
  },
];
