/**
 * Alignment / Layout section — all props split out from the old AlignmentBody.
 *
 * Each prop self-hides via `showWhen` based on the node's resolved layout mode
 * (flex / grid / block). Mode is detected from className: presence of `flex`
 * or `grid` keywords; flex-row/flex-col distinguishes flex direction.
 *
 * Helpers:
 *  - isFlex(cn): contains `flex` and not `grid`
 *  - isGrid(cn): contains `grid`
 *  - isFlexOrGrid(cn): contains either
 */
import React from "react";
import { TbSpacingHorizontal, TbSquare } from "react-icons/tb";
import type { PropertyDef } from "../propertyDefs";

const isFlex = (cn: string) => /\bflex\b/.test(cn);
const isGrid = (cn: string) => /\bgrid\b/.test(cn);
const isFlexOrGrid = (cn: string) => isFlex(cn) || isGrid(cn);

export const alignmentProperties: PropertyDef[] = [
  // ─── Container-only layout preset ─────────────────────────────────
  {
    id: "layout.preset",
    label: "Layout",
    section: "alignment",
    keywords: ["layout", "preset", "row", "column", "grid", "block", "container"],
    input: { type: "custom", component: "LayoutPresetSlot" },
    sortOrder: -10,
  },

  // ─── Flex controls (visible when flex) ───────────────────────────
  {
    id: "flexDirection",
    label: "Direction",
    section: "alignment",
    keywords: ["direction", "row", "column", "flex"],
    input: { type: "custom", component: "FlexDirectionInput" },
    showWhen: isFlex,
    pinned: true,
    sortOrder: 0,
  },
  {
    id: "gap",
    label: "Gap",
    section: "alignment",
    keywords: ["gap", "spacing", "gutter", "x", "y"],
    input: {
      type: "shorthand",
      tailwindKey: "gap",
      varSelectorPrefix: "gap",
      modes: [
        {
          id: "uniform",
          icon: React.createElement(TbSquare, { className: "size-3.5" }),
          ariaLabel: "Uniform gap",
          tags: ["gap"],
          labels: [""],
        },
        {
          id: "axes",
          icon: React.createElement(TbSpacingHorizontal, { className: "size-3.5" }),
          ariaLabel: "Gap X & Y",
          tags: ["gap-x", "gap-y"],
          labels: ["X", "Y"],
          tailwindKeys: ["gapX", "gapY"],
        },
      ],
    },
    showWhen: isFlexOrGrid,
    pinned: true,
    sortOrder: 5,
  },
  {
    id: "alignItems",
    label: "Align",
    section: "alignment",
    keywords: ["align", "items", "vertical", "cross"],
    input: { type: "tailwind-radio", tailwindKey: "alignItems", cols: true },
    showWhen: isFlex,
    sortOrder: 10,
  },
  {
    id: "justifyContent",
    label: "Justify",
    section: "alignment",
    keywords: ["justify", "content", "horizontal", "main"],
    input: { type: "tailwind-radio", tailwindKey: "justifyContent", cols: true },
    showWhen: isFlex,
    sortOrder: 11,
  },

  // ─── Flex (advanced — hidden until +Add) ─────────────────────────
  {
    id: "justifyItems",
    label: "Justify Items",
    section: "alignment",
    keywords: ["justify", "items"],
    input: { type: "tailwind-radio", tailwindKey: "justifyItems", cols: true },
    showWhen: isFlex,
    sortOrder: 100,
  },
  {
    id: "alignSelf",
    label: "Align Self",
    section: "alignment",
    keywords: ["align", "self"],
    input: { type: "tailwind-radio", tailwindKey: "alignSelf", cols: true },
    showWhen: isFlex,
    sortOrder: 110,
  },
  {
    id: "justifySelf",
    label: "Justify Self",
    section: "alignment",
    keywords: ["justify", "self"],
    input: { type: "tailwind-radio", tailwindKey: "justifySelf", cols: true },
    showWhen: isFlex,
    sortOrder: 120,
  },
  {
    id: "flexBase",
    label: "Grow / Shrink",
    section: "alignment",
    keywords: ["grow", "shrink", "basis", "flex"],
    input: { type: "tailwind-select", tailwindKey: "flexBase" },
    showWhen: isFlex,
    sortOrder: 130,
  },

  // ─── Grid controls (visible when grid) ───────────────────────────
  {
    id: "gridCols",
    label: "Columns",
    section: "alignment",
    keywords: ["grid", "columns", "cols", "template"],
    input: { type: "tailwind-select", tailwindKey: "gridCols" },
    showWhen: isGrid,
    pinned: true,
    sortOrder: 20,
  },
  {
    id: "gridRows",
    label: "Rows",
    section: "alignment",
    keywords: ["grid", "rows", "template"],
    input: { type: "tailwind-select", tailwindKey: "gridRows" },
    showWhen: isGrid,
    pinned: true,
    sortOrder: 21,
  },
  {
    id: "placeContent",
    label: "Place Content",
    section: "alignment",
    keywords: ["place", "content", "grid"],
    input: { type: "tailwind-radio", tailwindKey: "placeContent", cols: true },
    showWhen: isGrid,
    sortOrder: 22,
  },

  // ─── Grid (advanced) ─────────────────────────────────────────────
  {
    id: "gridColSpan",
    label: "Col Span",
    section: "alignment",
    keywords: ["grid", "column", "span"],
    input: { type: "tailwind-select", tailwindKey: "gridColSpan" },
    showWhen: isGrid,
    sortOrder: 200,
  },
  {
    id: "gridRowSpan",
    label: "Row Span",
    section: "alignment",
    keywords: ["grid", "row", "span"],
    input: { type: "tailwind-select", tailwindKey: "gridRowSpan" },
    showWhen: isGrid,
    sortOrder: 210,
  },
  {
    id: "placeItems",
    label: "Place Items",
    section: "alignment",
    keywords: ["place", "items", "grid"],
    input: { type: "tailwind-radio", tailwindKey: "placeItems", cols: true },
    showWhen: isGrid,
    sortOrder: 220,
  },
  {
    id: "placeSelf",
    label: "Place Self",
    section: "alignment",
    keywords: ["place", "self", "grid"],
    input: { type: "tailwind-radio", tailwindKey: "placeSelf", cols: true },
    showWhen: isGrid,
    sortOrder: 230,
  },
];
