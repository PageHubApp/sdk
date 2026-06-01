/** Container catalog — button-group / nav-strip presets. */
import { TbBrandTwitter, TbLayoutNavbar, TbMinus, TbPill, TbStack2 } from "react-icons/tb";
import type { ComponentPreset } from "../../../../define/types";
import {
  buildButtonGroupChildren,
  buildPillNavButtons,
  buildPlainNavButtons,
  buildSocialButtons,
  navListClassName,
} from "../buttonGroup";

export const buttonPresets: ComponentPreset[] = [
  {
    label: "Button Group",
    description: "A row of buttons sitting next to each other.",
    icon: TbStack2,
    category: "Buttons",
    props: {
      className:
        "flex flex-col items-center justify-start gap-space-xs md:flex-row md:items-center md:justify-start w-auto",
    },
    children: buildButtonGroupChildren,
  },
  {
    label: "Social Nav",
    description: "A row of social icons with brand-colour fills.",
    icon: TbBrandTwitter,
    category: "Navigation",
    props: { className: navListClassName },
    children: () => buildSocialButtons(true),
  },
  {
    label: "Social Icons",
    description: "A row of social icons coloured by brand.",
    icon: TbBrandTwitter,
    category: "Navigation",
    props: { className: navListClassName },
    children: () => buildSocialButtons(false),
  },
  {
    label: "Plain Nav",
    description: "A simple row of text links.",
    icon: TbMinus,
    category: "Navigation",
    props: { className: navListClassName },
    children: () => buildPlainNavButtons(false),
  },
  {
    label: "Minimal Nav",
    description: "Nav links with a coloured pill behind each.",
    icon: TbLayoutNavbar,
    category: "Navigation",
    props: { className: navListClassName },
    children: () => buildPlainNavButtons(true),
  },
  {
    label: "Pill Nav",
    description: "A compact pill-shaped row of nav links.",
    icon: TbPill,
    category: "Navigation",
    props: {
      className:
        "flex flex-row items-center gap-space-xs md:flex md:flex-row md:items-center md:gap-space-xs bg-primary rounded-full px-space-xs py-space-xs",
    },
    children: buildPillNavButtons,
  },
];
