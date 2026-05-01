/** Container — Component definition via defineComponent(). */
import React from "react";
import { Element } from "@craftjs/core";
import {
  TbAlertTriangle,
  TbAppWindow,
  TbBadge,
  TbBrandTwitter,
  TbChartBar,
  TbChevronDown,
  TbContainer,
  TbCookie,
  TbLayoutColumns,
  TbLayoutList,
  TbLayoutNavbar,
  TbLayoutRows,
  TbList,
  TbListCheck,
  TbListNumbers,
  TbMinus,
  TbCarouselHorizontal,
  TbColumns1,
  TbColumns2,
  TbColumns3,
  TbInfinity,
  TbLayoutGrid,
  TbLayoutSidebar,
  TbLayoutSidebarRight,
  TbPhoto,
  TbPill,
  TbSection,
  TbSlideshow,
  TbSpace,
  TbStack2,
  TbTable,
  TbUserCircle,
} from "react-icons/tb";
const ContainerMainTab = React.lazy(() =>
  import("../../chrome/toolbar/inspector/mainTabs/ContainerMainTab").then(mod => ({
    default: mod.ContainerMainTab,
  }))
);
const HeaderFooterToggles = React.lazy(() =>
  import("../../chrome/toolbar/inspector/mainTabs/ContainerMainTab").then(mod => ({
    default: mod.HeaderFooterToggles,
  }))
);
import { defineComponent } from "../../define";
import { Button } from "../Button/Button";
import { Container } from "./Container";
const ContainerPaddingOverlay = React.lazy(() =>
  import("../../chrome/canvas/ContainerPaddingOverlay").then(mod => ({
    default: mod.ContainerPaddingOverlay,
  }))
);
import { Icon } from "../Icon/Icon";
import { layoutCanvasCanMoveIn } from "../layoutCanvasCanMoveIn";
import { Text } from "../Text/Text";
import { Image } from "../Image/Image";


// Extracted helpers — see ./toHTML and ./presets/
import { toHTML } from "./toHTML";
export { toHTML };
import { buildSectionChildren } from "./presets/structure";
import {
  buildBulletedListChildren,
  buildNumberedListChildren,
  buildChecklistChildren,
  buildTableCell,
  buildTableChildren,
  buildAvatarChildren,
  baseGrid,
  buildGridCells,
  buildAlertChildren,
  buildStatChildren,
} from "./presets/lists";
import {
  navListClassName,
  buildSocialButtons,
  buildPlainNavButtons,
  buildPillNavButtons,
  buildButtonGroupChildren,
} from "./presets/buttonGroup";
import {
  buildSimpleImageChildren,
  buildMarqueeChildren,
  buildCarouselChildren,
} from "./presets/gallery";
import {
  buildModalChildren,
  buildTabsChildren,
  buildAccordionChildren,
  buildAccordionItemTemplate,
  buildDropdownChildren,
} from "./presets/overlays";
import { buildCookieConsentChildren } from "./presets/banners";
import {
  buildMobileMenuChildren,
  buildNavbarChildren,
  buildNavbarMegaChildren,
} from "./presets/navigation";

export const ContainerDef = defineComponent(
  {
    name: "Container",
    component: Container,
    icon: TbContainer,
    category: "Layout",
    canvas: true,
    settings: ContainerMainTab,
    toolbarExtra: <HeaderFooterToggles />,
    toHTML,
    tools: () => [<ContainerPaddingOverlay key="padding-overlay" />],
    rules: {
      canDrag: () => true,
      canDelete: () => true,
      canMoveIn: (node, into) => layoutCanvasCanMoveIn(node, into),
    },
    presets: [
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
          className:
            "border-base-300 border-b px-space-sm py-space-xs text-left font-semibold",
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
    ],
    modifiers: [
      // Composite patterns (real CSS classes via @utility in @pagehub/daisyui-spatial)
      // DaisyUI component classes go in `requires` — auto-added alongside the modifier.
      {
        name: "section-wrapper",
        label: "Section",
        category: "Pattern",
        description: "Full-width section with standard vertical padding and max-width content area",
      },
      {
        name: "section-wrapper-dark",
        label: "Section Dark",
        category: "Pattern",
        description: "Full-width dark section — dark background with light text, standard padding",
      },
      {
        name: "card-surface",
        label: "Card Surface",
        category: "Pattern",
        description: "Raised card with border, shadow, rounded corners, and padding",
        requires: "card",
      },
      {
        name: "icon-row",
        label: "Icon Row",
        category: "Pattern",
        description: "Horizontal flex row with gap — good for icon + label pairs",
      },
      {
        name: "content-col",
        label: "Content Column",
        category: "Pattern",
        description: "Vertical flex column with gap — good for stacked headings, copy, and CTAs",
      },
      {
        name: "hero-content-centered",
        label: "Hero Content",
        category: "Pattern",
        description:
          "Centered hero content with max-width constraint — use inside a hero container",
        requires: "hero-content",
      },
      // DaisyUI component roles
      {
        name: "card",
        label: "Card",
        category: "DaisyUI",
        description: "DaisyUI card — adds shadow, border-radius, and overflow clipping",
      },
      {
        name: "card-body",
        label: "Card Body",
        category: "DaisyUI",
        description: "Inner padding area of a DaisyUI card",
      },
      {
        name: "card-compact",
        label: "Compact Card",
        category: "DaisyUI",
        description: "Card with reduced padding — tighter than the default card-body",
      },
      {
        name: "hero",
        label: "Hero",
        category: "DaisyUI",
        description: "DaisyUI hero — full-width flex container with centered content layout",
      },
      {
        name: "hero-content",
        label: "Hero Content",
        category: "DaisyUI",
        description: "Inner content wrapper for a hero — constrains width and centers children",
      },
      {
        name: "hero-overlay",
        label: "Hero Overlay",
        category: "DaisyUI",
        description:
          "Dark semi-transparent overlay — place over a background image to improve text contrast",
      },
      {
        name: "navbar",
        label: "Navbar",
        category: "DaisyUI",
        description: "DaisyUI navbar — horizontal bar with padding and flex layout for nav items",
      },
      {
        name: "drawer",
        label: "Drawer",
        category: "DaisyUI",
        description: "DaisyUI drawer root — used for slide-in side panel layouts",
      },
      {
        name: "modal-box",
        label: "Modal Box",
        category: "DaisyUI",
        description: "DaisyUI modal content box — centered dialog with shadow and padding",
      },
      {
        name: "collapse",
        label: "Collapse",
        category: "DaisyUI",
        description: "DaisyUI collapsible container — children toggle open/closed",
      },
      {
        name: "collapse-title",
        label: "Collapse Title",
        category: "DaisyUI",
        description: "Clickable title row that toggles the collapse open or closed",
      },
      {
        name: "collapse-content",
        label: "Collapse Content",
        category: "DaisyUI",
        description: "Hidden content area that expands when the collapse is open",
      },
      // Spacing (spatial tokens)
      {
        name: "p-space-xs",
        label: "XS Padding",
        category: "Padding",
        description: "Extra-small padding on all sides using the density-aware spatial scale",
      },
      {
        name: "p-space-sm",
        label: "SM Padding",
        category: "Padding",
        description: "Small padding on all sides using the density-aware spatial scale",
      },
      {
        name: "p-space-md",
        label: "MD Padding",
        category: "Padding",
        description: "Medium padding on all sides using the density-aware spatial scale",
      },
      {
        name: "p-space-lg",
        label: "LG Padding",
        category: "Padding",
        description: "Large padding on all sides using the density-aware spatial scale",
      },
      {
        name: "p-space-xl",
        label: "XL Padding",
        category: "Padding",
        description: "Extra-large padding on all sides using the density-aware spatial scale",
      },
      // ── Animation patterns ────────────────────────────────────────────────
      // Express native <details> open/close transitions as Tailwind 4
      // arbitrary-variant utilities. Zero custom CSS — every class compiles
      // through the standard SSR Tailwind pipeline. Edit / clone via the
      // Modifiers Modal to author per-site variants.
      // `&` is the wrapper div — `::details-content` only exists on <details>,
      // so we need the descendant combinator (`_`) to target child <details>
      // elements: `[&_details::details-content]:…`.
      {
        name: "accordion-slide",
        label: "Slide",
        category: "Accordion",
        exclusive: true,
        renderAs: "patterns",
        description: "Animates height on <details> open/close — pure CSS, no JS",
        classes:
          "[&_details]:[interpolate-size:allow-keywords] " +
          "[&_details::details-content]:h-0 " +
          "[&_details::details-content]:overflow-clip " +
          "[&_details::details-content]:transition-all " +
          "[&_details::details-content]:duration-300 " +
          "[&_details::details-content]:ease-out " +
          "[&_details[open]::details-content]:h-auto " +
          "[&_details[open]::details-content]:starting:h-0 " +
          "[&_details::details-content]:[transition-behavior:allow-discrete]",
      },
      {
        name: "accordion-fade",
        label: "Fade",
        category: "Accordion",
        exclusive: true,
        renderAs: "patterns",
        description: "Animates opacity + height on <details> open/close",
        classes:
          "[&_details]:[interpolate-size:allow-keywords] " +
          "[&_details::details-content]:h-0 " +
          "[&_details::details-content]:opacity-0 " +
          "[&_details::details-content]:overflow-clip " +
          "[&_details::details-content]:transition-all " +
          "[&_details::details-content]:duration-300 " +
          "[&_details::details-content]:ease-out " +
          "[&_details[open]::details-content]:h-auto " +
          "[&_details[open]::details-content]:opacity-100 " +
          "[&_details[open]::details-content]:starting:h-0 " +
          "[&_details[open]::details-content]:starting:opacity-0 " +
          "[&_details::details-content]:[transition-behavior:allow-discrete]",
      },
      {
        name: "accordion-slide-fade",
        label: "Slide + Fade",
        category: "Accordion",
        exclusive: true,
        renderAs: "patterns",
        description: "Combined opacity + height animation (default Accordion preset)",
        classes:
          "[&_details]:[interpolate-size:allow-keywords] " +
          "[&_details::details-content]:h-0 " +
          "[&_details::details-content]:opacity-0 " +
          "[&_details::details-content]:overflow-clip " +
          "[&_details::details-content]:transition-all " +
          "[&_details::details-content]:duration-300 " +
          "[&_details::details-content]:ease-out " +
          "[&_details[open]::details-content]:h-auto " +
          "[&_details[open]::details-content]:opacity-100 " +
          "[&_details[open]::details-content]:starting:h-0 " +
          "[&_details[open]::details-content]:starting:opacity-0 " +
          "[&_details::details-content]:[transition-behavior:allow-discrete]",
      },
    ],
  },
  { __internal: true }
);
