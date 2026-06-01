/** Container catalog — interactive overlay presets (Modal, Tabs, Accordion, Cookie Consent, Dropdown). */
import { TbAppWindow, TbChevronDown, TbCookie, TbLayoutList, TbLayoutNavbar } from "react-icons/tb";
import type { ComponentPreset } from "../../../../define/types";
import {
  buildAccordionChildren,
  buildAccordionItemTemplate,
  buildDropdownChildren,
  buildModalChildren,
  buildTabsChildren,
} from "../overlays";
import { buildCookieConsentChildren } from "../banners";

export const overlayPresets: ComponentPreset[] = [
  {
    label: "Modal",
    description: "A pop-up window that opens when something is clicked.",
    icon: TbAppWindow,
    category: "Interactive",
    props: { className: "contents" },
    children: buildModalChildren,
  },
  {
    label: "Tabs",
    description: "Tabs you click to switch between sections.",
    icon: TbLayoutNavbar,
    category: "Interactive",
    props: { className: "flex flex-col w-full" },
    children: buildTabsChildren,
  },
  {
    label: "Accordion",
    description: "Click a row to reveal what's hidden inside.",
    icon: TbLayoutList,
    category: "Interactive",
    props: { className: "flex flex-col w-full accordion-slide-fade" },
    children: buildAccordionChildren,
    addChild: {
      label: "Add Item",
      template: buildAccordionItemTemplate,
      childLabel: (childNode: any, index: number) => {
        try {
          const headerId = childNode?.data?.nodes?.[0];
          if (!headerId) return `Item ${index + 1}`;
          return childNode?.data?.custom?.displayName || `Item ${index + 1}`;
        } catch {
          return `Item ${index + 1}`;
        }
      },
    },
  },
  {
    label: "Cookie Consent",
    description: "The 'accept cookies' bar at the bottom of the page.",
    icon: TbCookie,
    category: "Interactive",
    props: { className: "contents" },
    children: buildCookieConsentChildren,
  },
  {
    label: "Dropdown",
    description: "A menu that drops down when you click the trigger.",
    icon: TbChevronDown,
    category: "Interactive",
    props: {
      className: "group relative inline-flex flex-col self-start",
      attrs: { tabindex: 0 },
    },
    children: buildDropdownChildren,
  },
];
