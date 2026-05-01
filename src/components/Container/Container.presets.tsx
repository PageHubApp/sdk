/** Container — toolbox preset definitions (extracted from Container.craft.tsx). */
import { Element } from "@craftjs/core";
import {
  TbAlertTriangle,
  TbAppWindow,
  TbBadge,
  TbBrandTwitter,
  TbCarouselHorizontal,
  TbChartBar,
  TbChevronDown,
  TbColumns1,
  TbColumns2,
  TbColumns3,
  TbCookie,
  TbInfinity,
  TbLayoutColumns,
  TbLayoutGrid,
  TbLayoutList,
  TbLayoutNavbar,
  TbLayoutRows,
  TbLayoutSidebar,
  TbLayoutSidebarRight,
  TbList,
  TbListCheck,
  TbListNumbers,
  TbMinus,
  TbPhoto,
  TbPill,
  TbSection,
  TbSlideshow,
  TbSpace,
  TbStack2,
  TbTable,
  TbUserCircle,
} from "react-icons/tb";
import type { ComponentPreset } from "../../define/types";
import { Container } from "./Container";
import { Text } from "../Text/Text";
import { buildSectionChildren } from "./presets/structure";
import {
  baseGrid,
  buildAlertChildren,
  buildAvatarChildren,
  buildBulletedListChildren,
  buildChecklistChildren,
  buildGridCells,
  buildNumberedListChildren,
  buildStatChildren,
  buildTableCell,
  buildTableChildren,
} from "./presets/lists";
import {
  buildButtonGroupChildren,
  buildPillNavButtons,
  buildPlainNavButtons,
  buildSocialButtons,
  navListClassName,
} from "./presets/buttonGroup";
import {
  buildCarouselChildren,
  buildMarqueeChildren,
  buildSimpleImageChildren,
} from "./presets/gallery";
import {
  buildAccordionChildren,
  buildAccordionItemTemplate,
  buildDropdownChildren,
  buildModalChildren,
  buildTabsChildren,
} from "./presets/overlays";
import { buildCookieConsentChildren } from "./presets/banners";
import { buildMobileMenuChildren } from "./presets/navigation/MobileMenu";
import { buildNavbarChildren } from "./presets/navigation/Navbar";
import { buildNavbarMegaChildren } from "./presets/navigation/NavbarMega";
import { registerPresets } from "../../define/catalogRegistry";

export const containerPresets: ComponentPreset[] = [
  {
    label: "Section",
    icon: TbSection,
    description: "A full-width strip of the page with built-in padding.",
    props: {
      type: "section",
      className:
        "bg-base-100 text-base-content w-full flex flex-col items-center py-space-lg px-container-x",
    },
    children: buildSectionChildren,
  },
  {
    label: "Row",
    icon: TbLayoutColumns,
    description: "Lay things side-by-side in a row.",
    props: {
      className: "flex flex-row flex-wrap gap-space-md items-start min-w-0 w-full",
    },
  },
  {
    label: "Column",
    icon: TbLayoutRows,
    description: "Stack things on top of each other in a column.",
    props: { className: "flex flex-col gap-space-md w-full" },
  },
  // ─── Pseudo-component presets (live in other toolbox categories) ───
  {
    label: "Badge",
    description: "A tiny pill for tags, status, or labels.",
    icon: TbBadge,
    category: "Components",
    props: { className: "badge badge-primary font-medium self-start" },
    children: () => [
      <Element
        key="label"
        is={Text}
        custom={{ displayName: "Label" }}
        text="New"
        canDelete={true}
        canEditName={true}
      />,
    ],
  },
  {
    label: "Avatar",
    description: "A round photo for profile or team headshots.",
    icon: TbUserCircle,
    category: "Components",
    props: { className: "w-16 h-16 rounded-full overflow-hidden shrink-0" },
    children: buildAvatarChildren,
  },
  {
    label: "Alert",
    description: "A coloured banner that says 'heads up'.",
    icon: TbAlertTriangle,
    category: "Components",
    props: { className: "alert alert-info flex flex-row items-center gap-space-xs w-full" },
    children: buildAlertChildren,
  },
  {
    label: "Stat",
    description: "A big number with a label underneath.",
    icon: TbChartBar,
    category: "Components",
    props: { className: "flex flex-col items-center gap-space-xs text-center" },
    children: buildStatChildren,
  },
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
    label: "Bulleted List",
    description: "A simple bulleted list of points.",
    icon: TbList,
    category: "Lists",
    props: {
      type: "ul",
      className: "list-disc pl-space-md space-y-space-xs",
    },
    children: buildBulletedListChildren,
  },
  {
    label: "Numbered List",
    description: "An ordered list with numbers down the left.",
    icon: TbListNumbers,
    category: "Lists",
    props: {
      type: "ol",
      className: "list-decimal pl-space-md space-y-space-xs",
    },
    children: buildNumberedListChildren,
  },
  {
    label: "Checklist",
    description: "A list of rows each with a leading check icon.",
    icon: TbListCheck,
    category: "Lists",
    props: {
      type: "ul",
      className: "list-none flex flex-col gap-space-sm",
    },
    children: buildChecklistChildren,
  },
  {
    label: "List Item",
    description: "A single <li> row inside a list.",
    icon: TbList,
    category: "Lists",
    props: { type: "li" },
    children: () => [
      <Element
        key="text"
        is={Text}
        custom={{ displayName: "Text" }}
        text="<p>List item</p>"
        canDelete={true}
        canEditName={true}
      />,
    ],
  },
  {
    label: "Table",
    description: "A data table with header row and body rows.",
    icon: TbTable,
    category: "Tables",
    props: {
      type: "table",
      className: "table w-full border-collapse text-sm",
    },
    children: buildTableChildren,
  },
  {
    label: "Table Head",
    description: "A <thead> section — header rows for a table.",
    icon: TbTable,
    category: "Tables",
    props: { type: "thead" },
    children: () => [
      <Element
        key="row"
        canvas
        is={Container}
        type="tr"
        custom={{ displayName: "Row" }}
        canDelete={true}
        canEditName={true}
      >
        {buildTableCell("Header", "Column", true)}
      </Element>,
    ],
  },
  {
    label: "Table Body",
    description: "A <tbody> section — data rows for a table.",
    icon: TbTable,
    category: "Tables",
    props: { type: "tbody" },
    children: () => [
      <Element
        key="row"
        canvas
        is={Container}
        type="tr"
        custom={{ displayName: "Row" }}
        canDelete={true}
        canEditName={true}
      >
        {buildTableCell("Cell", "Cell", false)}
      </Element>,
    ],
  },
  {
    label: "Table Foot",
    description: "A <tfoot> section — footer rows for a table.",
    icon: TbTable,
    category: "Tables",
    props: { type: "tfoot" },
    children: () => [
      <Element
        key="row"
        canvas
        is={Container}
        type="tr"
        custom={{ displayName: "Row" }}
        canDelete={true}
        canEditName={true}
      >
        {buildTableCell("Cell", "Total", false)}
      </Element>,
    ],
  },
  {
    label: "Table Row",
    description: "A single <tr> with one cell.",
    icon: TbTable,
    category: "Tables",
    props: { type: "tr" },
    children: () => [buildTableCell("Cell", "Cell", false)],
  },
  {
    label: "Table Cell",
    description: "A single <td> data cell.",
    icon: TbTable,
    category: "Tables",
    props: {
      type: "td",
      className: "border-base-300 border-b px-space-sm py-space-xs",
    },
    children: () => [
      <Element
        key="text"
        is={Text}
        custom={{ displayName: "Text" }}
        text="<p>Cell</p>"
        canDelete={true}
        canEditName={true}
      />,
    ],
  },
  {
    label: "Table Header Cell",
    description: "A single <th> header cell with scope=col.",
    icon: TbTable,
    category: "Tables",
    props: {
      type: "th",
      className: "border-base-300 border-b px-space-sm py-space-xs text-left font-semibold",
      attrs: { scope: "col" },
    },
    children: () => [
      <Element
        key="text"
        is={Text}
        custom={{ displayName: "Text" }}
        text="<p>Header</p>"
        canDelete={true}
        canEditName={true}
      />,
    ],
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
  // ─── Button-group / nav-strip presets ───
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
  // ─── Image gallery presets ───
  {
    label: "Image Group",
    description: "A row of pictures sitting next to each other.",
    icon: TbPhoto,
    category: "Images",
    props: {
      className: "flex flex-row items-center gap-space-sm w-full",
    },
    children: buildSimpleImageChildren,
  },
  {
    label: "Image Grid",
    description: "A grid of pictures with equal-width columns.",
    icon: TbLayoutGrid,
    category: "Images",
    props: {
      className: "grid grid-cols-3 gap-space-sm w-full",
    },
    children: buildSimpleImageChildren,
  },
  {
    label: "Image Masonry",
    description: "A staggered Pinterest-style column layout.",
    icon: TbColumns2,
    category: "Images",
    props: {
      className: "columns-3 gap-space-sm w-full [&>*]:mb-space-sm [&>*]:break-inside-avoid",
    },
    children: buildSimpleImageChildren,
  },
  {
    label: "Image Marquee",
    description: "Pictures scrolling sideways in an endless loop.",
    icon: TbInfinity,
    category: "Images",
    props: {
      className: "flex w-full overflow-hidden hover:[animation-play-state:paused]",
      root: { animation: "cssMarquee" },
    },
    children: buildMarqueeChildren,
  },
  {
    label: "Image Carousel",
    description: "A slideshow with prev/next arrows and dots.",
    icon: TbCarouselHorizontal,
    category: "Images",
    props: {
      className: "relative overflow-hidden w-full rounded-box",
    },
    children: () => buildCarouselChildren({ hero: false }),
  },
  {
    label: "Image Hero",
    description: "A full-width slideshow showing one big image at a time.",
    icon: TbSlideshow,
    category: "Images",
    props: {
      className: "relative overflow-hidden w-full rounded-box",
    },
    children: () => buildCarouselChildren({ hero: true }),
  },
  // ─── Grid layout presets ───
  {
    label: "Single column",
    icon: TbColumns1,
    category: "Grid",
    description: "Just one column — everything stacks.",
    props: { className: `${baseGrid} grid-cols-1 gap-space-md` },
    children: () => buildGridCells(1),
  },
  {
    label: "Two columns",
    icon: TbColumns2,
    category: "Grid",
    description: "Two equal columns on desktop.",
    props: { className: `${baseGrid} grid-cols-1 gap-space-md md:grid-cols-2` },
    children: () => buildGridCells(2),
  },
  {
    label: "Three columns",
    icon: TbColumns3,
    category: "Grid",
    description: "Three columns on bigger screens.",
    props: { className: `${baseGrid} grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-3` },
    children: () => buildGridCells(3),
  },
  {
    label: "Four columns",
    icon: TbLayoutGrid,
    category: "Grid",
    description: "Four columns — good for cards or icons.",
    props: { className: `${baseGrid} grid-cols-2 gap-space-md md:grid-cols-4` },
    children: () => buildGridCells(4),
  },
  {
    label: "2x2 grid",
    icon: TbLayoutGrid,
    category: "Grid",
    description: "Two columns by two rows.",
    props: { className: `${baseGrid} grid-cols-2 grid-rows-2 gap-space-md` },
    children: () => buildGridCells(4),
  },
  {
    label: "3x2 grid",
    icon: TbLayoutGrid,
    category: "Grid",
    description: "Three columns by two rows.",
    props: { className: `${baseGrid} grid-cols-3 grid-rows-2 gap-space-md` },
    children: () => buildGridCells(6),
  },
  {
    label: "Wide left",
    icon: TbLayoutSidebarRight,
    category: "Grid",
    description: "Big main column on the left, sidebar on the right.",
    props: { className: `${baseGrid} grid-cols-1 gap-space-md md:grid-cols-[2fr_1fr]` },
    children: () => buildGridCells(2),
  },
  {
    label: "Wide right",
    icon: TbLayoutSidebar,
    category: "Grid",
    description: "Sidebar on the left, big main column on the right.",
    props: { className: `${baseGrid} grid-cols-1 gap-space-md md:grid-cols-[1fr_2fr]` },
    children: () => buildGridCells(2),
  },
  {
    label: "Wide middle",
    icon: TbLayoutGrid,
    category: "Grid",
    description: "Three columns with the middle one bigger.",
    props: { className: `${baseGrid} grid-cols-1 gap-space-md lg:grid-cols-[1fr_2fr_1fr]` },
    children: () => buildGridCells(3),
  },
];

registerPresets("Container", containerPresets);
