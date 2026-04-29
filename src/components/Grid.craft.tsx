/**
 * Grid — Tailwind CSS grid layout canvas; same child rules as Container.
 */
import React from "react";
import {
  TbColumns1,
  TbColumns2,
  TbColumns3,
  TbLayoutGrid,
  TbLayoutSidebar,
  TbLayoutSidebarRight,
} from "react-icons/tb";
import { defineComponent } from "../define";
import { Grid } from "./Grid";
import { staticClasses, getInlineStyle, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";
import { GridMainTab } from "../chrome/toolbar/unified-settings/mainTabs/GridMainTab";
import { HoverNodeController, DeleteNodeController } from "./editor-chrome";
import { layoutCanvasCanMoveIn } from "./layoutCanvasCanMoveIn";

// Tabler-style preset icons for layouts not covered by react-icons/tb.
// 24x24 viewBox, stroke 2, rounded — mirrors the rounded-rect shape Tabler uses for TbColumns*.
const svgBase = {
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  fill: "none",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  width: "1em",
  height: "1em",
};
const outerRect =
  "M3 3m0 1a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v16a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1z";

const IconFourColumns: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...svgBase} className={className}>
    <path d={`${outerRect}m4.5 -1v18m4.5 -18v18m4.5 -18v18`} />
  </svg>
);

const IconGrid3x2: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...svgBase} className={className}>
    <path d={outerRect} />
    <path d="M9 3v18M15 3v18M3 12h18" />
  </svg>
);

const IconHeaderTwoCols: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...svgBase} className={className}>
    <path d={outerRect} />
    <path d="M3 9h18M12 9v12" />
  </svg>
);

const IconWideMiddle: React.FC<{ className?: string }> = ({ className }) => (
  <svg {...svgBase} className={className}>
    <path d={outerRect} />
    <path d="M7.5 3v18M16.5 3v18" />
  </svg>
);

const toHTML: ToHTMLFn = (props, children, ctx) => {
  return tag(
    "div",
    {
      class: staticClasses(props, ctx) || undefined,
      style: getInlineStyle(props) || undefined,
      id: props.id || props.anchor || undefined,
      ...ariaAttrs(props),
    },
    children
  );
};

const baseGrid = "grid w-full min-w-0 text-base-content";

export const GridDef = defineComponent(
  {
    name: "Grid",
    displayName: "Grid",
    component: Grid,
    icon: TbLayoutGrid,
    category: "Grid",
    canvas: true,
    settings: GridMainTab,
    toHTML,
    disable: ["textColor", "bgColor", "shadow", "opacity", "hoverClick"],
    rules: {
      canDrag: () => true,
      canMoveIn: (nodes, into) => layoutCanvasCanMoveIn(nodes, into),
    },
    tools: () => [
      <HoverNodeController
        key="gridHover"
        position="top"
        align="end"
        placement="end"
        alt={{ position: "bottom", align: "start", placement: "start" }}
      />,
      <DeleteNodeController key="gridDelete" />,
    ],
    presets: [
      {
        label: "Single column",
        icon: TbColumns1,
        description: "Just one column — everything stacks.",
        props: { className: `${baseGrid} grid-cols-1 gap-space-md` },
      },
      {
        label: "Two columns",
        icon: TbColumns2,
        description: "Two equal columns on desktop.",
        props: { className: `${baseGrid} grid-cols-1 gap-space-md md:grid-cols-2` },
      },
      {
        label: "Three columns",
        icon: TbColumns3,
        description: "Three columns on bigger screens.",
        props: { className: `${baseGrid} grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-3` },
      },
      {
        label: "Four columns",
        icon: IconFourColumns,
        description: "Four columns — good for cards or icons.",
        props: { className: `${baseGrid} grid-cols-2 gap-space-md md:grid-cols-4` },
      },
      {
        label: "2x2 grid",
        icon: TbLayoutGrid,
        description: "Two columns by two rows.",
        props: { className: `${baseGrid} grid-cols-2 grid-rows-2 gap-space-md` },
      },
      {
        label: "3x2 grid",
        icon: IconGrid3x2,
        description: "Three columns by two rows.",
        props: { className: `${baseGrid} grid-cols-3 grid-rows-2 gap-space-md` },
      },
      {
        label: "Header + 2 columns",
        icon: IconHeaderTwoCols,
        description: "A wide header on top, two columns below.",
        props: { className: `${baseGrid} grid-cols-2 grid-rows-2 gap-space-md` },
      },
      {
        label: "Wide left",
        icon: TbLayoutSidebarRight,
        description: "Big main column on the left, sidebar on the right.",
        props: { className: `${baseGrid} grid-cols-1 gap-space-md md:grid-cols-[2fr_1fr]` },
      },
      {
        label: "Wide right",
        icon: TbLayoutSidebar,
        description: "Sidebar on the left, big main column on the right.",
        props: { className: `${baseGrid} grid-cols-1 gap-space-md md:grid-cols-[1fr_2fr]` },
      },
      {
        label: "Wide middle",
        icon: IconWideMiddle,
        description: "Three columns with the middle one bigger.",
        props: { className: `${baseGrid} grid-cols-1 gap-space-md lg:grid-cols-[1fr_2fr_1fr]` },
      },
    ],
  },
  { __internal: true }
);
