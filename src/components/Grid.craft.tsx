/**
 * Grid — Tailwind CSS grid layout canvas; same child rules as Container.
 */
import React from "react";
import { TbLayoutGrid } from "react-icons/tb";
import { defineComponent } from "../define";
import { Grid } from "./Grid";
import { staticClasses, getInlineStyle, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";
import { GridMainTab } from "../chrome/toolbar/unified-settings/mainTabs/GridMainTab";
import { HoverNodeController, DeleteNodeController } from "./editor-chrome";
import { layoutCanvasCanMoveIn } from "./layoutCanvasCanMoveIn";

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
        description: "One column — stack on all breakpoints.",
        props: { className: `${baseGrid} grid-cols-1 gap-space-md` },
      },
      {
        label: "Two columns",
        description: "Two equal columns on desktop.",
        props: { className: `${baseGrid} grid-cols-1 gap-space-md md:grid-cols-2` },
      },
      {
        label: "Three columns",
        description: "Three columns on large screens.",
        props: { className: `${baseGrid} grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-3` },
      },
      {
        label: "Four columns",
        description: "Dense grid for cards or icons.",
        props: { className: `${baseGrid} grid-cols-2 gap-space-md md:grid-cols-4` },
      },
      {
        label: "2x2 grid",
        description: "Two columns and two rows.",
        props: { className: `${baseGrid} grid-cols-2 grid-rows-2 gap-space-md` },
      },
      {
        label: "3x2 grid",
        description: "Three by two cell grid.",
        props: { className: `${baseGrid} grid-cols-3 grid-rows-2 gap-space-md` },
      },
      {
        label: "Header + 2 columns",
        description: "Full-width header row, two cells below.",
        props: { className: `${baseGrid} grid-cols-2 grid-rows-2 gap-space-md` },
      },
      {
        label: "Wide left",
        description: "Two columns — main + sidebar.",
        props: { className: `${baseGrid} grid-cols-1 gap-space-md md:grid-cols-[2fr_1fr]` },
      },
      {
        label: "Wide right",
        description: "Two columns — sidebar + main.",
        props: { className: `${baseGrid} grid-cols-1 gap-space-md md:grid-cols-[1fr_2fr]` },
      },
      {
        label: "Wide middle",
        description: "Three columns with emphasized center.",
        props: { className: `${baseGrid} grid-cols-1 gap-space-md lg:grid-cols-[1fr_2fr_1fr]` },
      },
    ],
  },
  { __internal: true }
);
