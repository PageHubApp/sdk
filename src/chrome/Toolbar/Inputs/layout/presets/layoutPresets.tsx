import React from "react";
import { generateLayoutIcon } from "../../LayoutIconGenerator";

// ─── Types ───

export interface LayoutPreset {
  name: string;
  icon: React.ReactNode;
  layout: "flex" | "grid";
  direction?: "row" | "column";
  columns?: number;
  rows?: number;
  gridTemplate?: string;
  gridRows?: string;
  flexDirection?: string;
  flexWrap?: string;
  gap?: string;
  asymmetric?: boolean;
  widths?: string[];
}

// ─── Flex Presets ───

export function getFlexPresets(direction: "row" | "column"): LayoutPreset[] {
  const isColumn = direction === "column";
  const containerClass = isColumn ? "flex h-full gap-px" : "flex flex-col h-full gap-px";
  const itemClass = "flex-1 rounded-sm bg-primary/30";

  const base: LayoutPreset[] = [
    {
      name: isColumn ? "Single Column" : "Single Row",
      icon: (
        <div className="h-6 w-full overflow-hidden rounded-sm border border-base-300 p-px">
          <div className="h-full rounded-sm bg-primary/30" />
        </div>
      ),
      layout: "flex",
      direction,
      flexDirection: isColumn ? "flex-row" : "flex-col",
      columns: 1,
      gap: "gap-4",
    },
    {
      name: isColumn ? "Two Columns" : "Two Rows",
      icon: (
        <div className="h-6 w-full overflow-hidden rounded-sm border border-base-300 p-px">
          <div className={containerClass}>
            <div className={itemClass} />
            <div className={itemClass} />
          </div>
        </div>
      ),
      layout: "flex",
      direction,
      flexDirection: isColumn ? "flex-row" : "flex-col",
      columns: 2,
      gap: "gap-4",
    },
    {
      name: isColumn ? "Three Columns" : "Three Rows",
      icon: (
        <div className="h-6 w-full overflow-hidden rounded-sm border border-base-300 p-px">
          <div className={containerClass}>
            <div className={itemClass} />
            <div className={itemClass} />
            <div className={itemClass} />
          </div>
        </div>
      ),
      layout: "flex",
      direction,
      flexDirection: isColumn ? "flex-row" : "flex-col",
      columns: 3,
      gap: "gap-4",
    },
    {
      name: isColumn ? "Four Columns" : "Four Rows",
      icon: (
        <div className="h-6 w-full overflow-hidden rounded-sm border border-base-300 p-px">
          <div className={containerClass}>
            <div className={itemClass} />
            <div className={itemClass} />
            <div className={itemClass} />
            <div className={itemClass} />
          </div>
        </div>
      ),
      layout: "flex",
      direction,
      flexDirection: isColumn ? "flex-row" : "flex-col",
      columns: 4,
      gap: "gap-4",
    },
  ];

  if (!isColumn) return base;

  // Asymmetric presets (columns only)
  return [
    ...base,
    {
      name: "Wide Left",
      icon: (
        <div className="h-6 w-full overflow-hidden rounded-sm border border-base-300 p-px">
          <div className="flex h-full gap-px">
            <div className="w-3/4 rounded-sm bg-primary/30" />
            <div className="w-1/4 rounded-sm bg-primary/20" />
          </div>
        </div>
      ),
      layout: "flex",
      direction,
      flexDirection: "flex-row",
      columns: 2,
      gap: "gap-4",
      asymmetric: true,
      widths: ["w-3/4", "w-1/4"],
    },
    {
      name: "Wide Right",
      icon: (
        <div className="h-6 w-full overflow-hidden rounded-sm border border-base-300 p-px">
          <div className="flex h-full gap-px">
            <div className="w-1/4 rounded-sm bg-primary/20" />
            <div className="w-3/4 rounded-sm bg-primary/30" />
          </div>
        </div>
      ),
      layout: "flex",
      direction,
      flexDirection: "flex-row",
      columns: 2,
      gap: "gap-4",
      asymmetric: true,
      widths: ["w-1/4", "w-3/4"],
    },
    {
      name: "Wide Middle",
      icon: generateLayoutIcon({ type: "flex", columns: 3, widths: ["w-1/4", "w-1/2", "w-1/4"] }),
      layout: "flex",
      direction,
      flexDirection: "flex-row",
      columns: 3,
      gap: "gap-4",
      asymmetric: true,
      widths: ["w-1/4", "w-1/2", "w-1/4"],
    },
  ];
}

// ─── Grid Presets ───

export const GRID_PRESETS: LayoutPreset[] = [
  {
    name: "Single Column",
    icon: (
      <div className="grid h-6 w-full overflow-hidden rounded-sm border border-base-300 p-px">
        <div className="rounded-sm bg-primary/30" />
      </div>
    ),
    layout: "grid",
    columns: 1,
    gridTemplate: "grid-cols-1",
    gap: "gap-4",
  },
  {
    name: "Two Columns",
    icon: (
      <div className="grid h-6 w-full grid-cols-2 gap-px overflow-hidden rounded-sm border border-base-300 p-px">
        <div className="rounded-sm bg-primary/30" />
        <div className="rounded-sm bg-primary/30" />
      </div>
    ),
    layout: "grid",
    columns: 2,
    gridTemplate: "grid-cols-2",
    gap: "gap-4",
  },
  {
    name: "2x2 Grid",
    icon: (
      <div className="grid h-6 w-full grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-sm border border-base-300 p-px">
        <div className="rounded-sm bg-primary/30" />
        <div className="rounded-sm bg-primary/30" />
        <div className="rounded-sm bg-primary/30" />
        <div className="rounded-sm bg-primary/30" />
      </div>
    ),
    layout: "grid",
    columns: 4,
    gridTemplate: "grid-cols-2",
    gridRows: "grid-rows-2",
    gap: "gap-4",
  },
  {
    name: "Three Columns",
    icon: (
      <div className="grid h-6 w-full grid-cols-3 gap-px overflow-hidden rounded-sm border border-base-300 p-px">
        <div className="rounded-sm bg-primary/30" />
        <div className="rounded-sm bg-primary/30" />
        <div className="rounded-sm bg-primary/30" />
      </div>
    ),
    layout: "grid",
    columns: 3,
    gridTemplate: "grid-cols-3",
    gap: "gap-4",
  },
  {
    name: "3x2 Grid",
    icon: (
      <div className="grid h-6 w-full grid-cols-3 grid-rows-2 gap-px overflow-hidden rounded-sm border border-base-300 p-px">
        <div className="rounded-sm bg-primary/30" />
        <div className="rounded-sm bg-primary/30" />
        <div className="rounded-sm bg-primary/30" />
        <div className="rounded-sm bg-primary/30" />
        <div className="rounded-sm bg-primary/30" />
        <div className="rounded-sm bg-primary/30" />
      </div>
    ),
    layout: "grid",
    columns: 6,
    gridTemplate: "grid-cols-3",
    gridRows: "grid-rows-2",
    gap: "gap-4",
  },
  {
    name: "Four Columns",
    icon: (
      <div className="grid h-6 w-full grid-cols-4 gap-px overflow-hidden rounded-sm border border-base-300 p-px">
        <div className="rounded-sm bg-primary/30" />
        <div className="rounded-sm bg-primary/30" />
        <div className="rounded-sm bg-primary/30" />
        <div className="rounded-sm bg-primary/30" />
      </div>
    ),
    layout: "grid",
    columns: 4,
    gridTemplate: "grid-cols-4",
    gap: "gap-4",
  },
  {
    name: "Header + 2 Columns",
    icon: generateLayoutIcon({ type: "grid", columns: 2, rows: 4, spans: ["col-span-2 row-span-2", "row-span-2", "row-span-2"] }),
    layout: "grid",
    columns: 3,
    gridTemplate: "grid-cols-2",
    gridRows: "grid-rows-2",
    gap: "gap-4",
  },
  {
    name: "Wide Left",
    icon: (
      <div className="h-6 w-full overflow-hidden rounded-sm border border-base-300 p-px">
        <div className="grid h-full grid-cols-[3fr_1fr] gap-px overflow-hidden rounded-sm border border-base-300 p-px">
          <div className="rounded-sm bg-primary/30" />
          <div className="rounded-sm bg-primary/20" />
        </div>
      </div>
    ),
    layout: "grid",
    columns: 2,
    gridTemplate: "grid-cols-[2fr_1fr]",
    gap: "gap-4",
  },
  {
    name: "Wide Right",
    icon: (
      <div className="h-6 w-full overflow-hidden rounded-sm border border-base-300 p-px">
        <div className="grid h-full grid-cols-[1fr_3fr] gap-px overflow-hidden rounded-sm border border-base-300 p-px">
          <div className="rounded-sm bg-primary/20" />
          <div className="rounded-sm bg-primary/30" />
        </div>
      </div>
    ),
    layout: "grid",
    columns: 2,
    gridTemplate: "grid-cols-[1fr_2fr]",
    gap: "gap-4",
  },
  {
    name: "Wide Middle",
    icon: (
      <div className="h-6 w-full overflow-hidden rounded-sm border border-base-300 p-px">
        <div className="grid h-full grid-cols-[1fr_2fr_1fr] gap-px overflow-hidden rounded-sm border border-base-300 p-px">
          <div className="rounded-sm bg-primary/20" />
          <div className="rounded-sm bg-primary/30" />
          <div className="rounded-sm bg-primary/20" />
        </div>
      </div>
    ),
    layout: "grid",
    columns: 3,
    gridTemplate: "grid-cols-[1fr_2fr_1fr]",
    gap: "gap-4",
  },
];

// ─── Display variants ───

export const DISPLAY_VARIANTS = [
  { value: "inline-block", label: "Inline-block" },
  { value: "inline-flex", label: "Inline-flex" },
  { value: "inline-grid", label: "Inline-grid" },
  { value: "inline", label: "Inline" },
  { value: "hidden", label: "None" },
] as const;
