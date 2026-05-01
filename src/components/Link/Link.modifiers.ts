/** Link — modifiers extracted from Link.craft.tsx. */
import type { ComponentModifier } from "../../define/types";

export const linkModifiers: ComponentModifier[] = [
      // DaisyUI link color variants
      {
        name: "link-primary",
        label: "Primary",
        category: "Color",
        description: "Primary brand color",
        exclusive: true,
        requires: "link",
      },
      {
        name: "link-secondary",
        label: "Secondary",
        category: "Color",
        description: "Secondary brand color",
        exclusive: true,
        requires: "link",
      },
      {
        name: "link-accent",
        label: "Accent",
        category: "Color",
        description: "Accent color",
        exclusive: true,
        requires: "link",
      },
      {
        name: "link-neutral",
        label: "Neutral",
        category: "Color",
        description: "Neutral color",
        exclusive: true,
        requires: "link",
      },
      {
        name: "link-info",
        label: "Info",
        category: "Color",
        exclusive: true,
        requires: "link",
      },
      {
        name: "link-success",
        label: "Success",
        category: "Color",
        exclusive: true,
        requires: "link",
      },
      {
        name: "link-warning",
        label: "Warning",
        category: "Color",
        exclusive: true,
        requires: "link",
      },
      {
        name: "link-error",
        label: "Error",
        category: "Color",
        exclusive: true,
        requires: "link",
      },
      // DaisyUI link style variants
      {
        name: "link-hover",
        label: "Underline on Hover",
        category: "Style",
        description: "Underline appears only on hover",
        requires: "link",
      },
];
