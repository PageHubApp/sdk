/** Container catalog — composite navigation presets (Navbar, Navbar mega, Mobile Menu). */
import { TbLayoutNavbar } from "react-icons/tb";
import type { ComponentPreset } from "../../../../define/types";
import { buildMobileMenuChildren } from "../navigation/MobileMenu";
import { buildNavbarChildren } from "../navigation/Navbar";
import { buildNavbarMegaChildren } from "../navigation/NavbarMega";

export const navigationPresets: ComponentPreset[] = [
  {
    label: "Navbar",
    description: "A site header with logo, links, and a mobile menu.",
    icon: TbLayoutNavbar,
    category: "Navigation",
    props: { className: "contents" },
    children: buildNavbarChildren,
  },
  {
    label: "Navbar (mega)",
    description: "A header with a big drop-down panel of grouped links.",
    icon: TbLayoutNavbar,
    category: "Navigation",
    props: { className: "contents" },
    children: buildNavbarMegaChildren,
  },
  {
    label: "Mobile Menu",
    description: "Just the hamburger button and slide-in drawer.",
    icon: TbLayoutNavbar,
    category: "Navigation",
    props: { className: "contents" },
    children: buildMobileMenuChildren,
  },
];
