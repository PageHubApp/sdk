/** Container catalog — grid layout presets (1col … 3x2, Wide left/right/middle). */
import {
  TbColumns1,
  TbColumns2,
  TbColumns3,
  TbLayoutGrid,
  TbLayoutSidebar,
  TbLayoutSidebarRight,
} from "react-icons/tb";
import type { ComponentPreset } from "../../../../define/types";
import { baseGrid, buildGridCells } from "../lists";

export const gridPresets: ComponentPreset[] = [
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
