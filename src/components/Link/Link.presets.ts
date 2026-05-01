/** Link — presets extracted from Link.craft.tsx. */
import { Link } from "./Link";
import type { ComponentPreset } from "../../define/types";
import { registerPresets } from "../../define/catalogRegistry";

export const linkPresets: ComponentPreset[] = [
      {
        label: "Link",
        description: "Plain text you can click to go somewhere.",
        props: {
          text: "Learn more",
          className: "link link-hover",
        },
      },
      {
        label: "Arrow Link",
        description: "A 'read more' style text link with an arrow on the end.",
        props: {
          text: "Read more",
          icon: {
            value: "ref-icon:tb/TbArrowRight",
            position: "right",
            size: "w-4 h-4",
          },
          className: "link link-hover",
        },
      },
];

registerPresets("Link", linkPresets);
