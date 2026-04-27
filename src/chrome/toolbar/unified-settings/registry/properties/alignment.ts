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
import {
  TbBoxPadding,
  TbGridDots,
  TbGridScan,
  TbSpacingHorizontal,
  TbSquare,
} from "react-icons/tb";
import type { PropertyDef } from "../propertyDefs";

const SPACING_TYPES = ["tailwind", "calc", "px", "em", "rem", "%"] as const;

const isFlex = (cn: string) => /\bflex\b/.test(cn);
const isGrid = (cn: string) => /\bgrid\b/.test(cn);
const isFlexOrGrid = (cn: string) => isFlex(cn) || isGrid(cn);

export const alignmentProperties: PropertyDef[] = [
  // ─── Container-only layout preset (always visible — slot self-hides
  // for non-container nodes via useHasContainerType) ────────────────
  {
    id: "layout.preset",
    label: "Layout",
    section: "alignment",
    keywords: ["layout", "preset", "row", "column", "grid", "block", "container"],
    input: { type: "custom", component: "LayoutPresetSlot" },
    pinned: true,
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
    pinned: false,
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
    pinned: false,
    sortOrder: 5,
  },
  {
    id: "space",
    label: "Space",
    section: "alignment",
    keywords: ["space", "between", "siblings", "x", "y"],
    input: {
      type: "shorthand",
      varSelectorPrefix: "space",
      allowedTypes: [...SPACING_TYPES],
      modes: [
        {
          id: "axes",
          icon: React.createElement(TbBoxPadding, { className: "size-3.5" }),
          ariaLabel: "Space between X & Y",
          tags: ["space-x", "space-y"],
          labels: ["X", "Y"],
          tailwindKeys: ["spaceX", "spaceY"],
        },
      ],
    },
    showWhen: isFlex,
    sortOrder: 6,
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
    label: "Flex",
    section: "alignment",
    keywords: ["grow", "shrink", "basis", "flex", "fill", "auto", "fixed"],
    input: {
      type: "tailwind-radio",
      tailwindKey: "flexBase",
      cols: true,
      options: [
        { label: "Fill", value: "flex-1", hint: "Grow and shrink to fill remaining space" },
        { label: "Auto", value: "flex-auto", hint: "Size to content; can grow and shrink" },
        { label: "Default", value: "flex-initial", hint: "Size to content; can shrink only" },
        { label: "Fixed", value: "flex-none", hint: "Keep content size; no grow or shrink" },
      ],
    },
    showWhen: isFlex,
    sortOrder: 130,
  },

  // gridCols / gridRows are owned by the LayoutPreset picker at the top of
  // this section — no separate bundle here.
  {
    id: "placeContent",
    label: "Place Content",
    section: "alignment",
    keywords: ["place", "content", "grid"],
    input: { type: "tailwind-radio", tailwindKey: "placeContent", cols: true },
    showWhen: isGrid,
    sortOrder: 22,
  },

  // ─── Grid span (advanced, visible when grid) ─────────────────────
  {
    id: "gridSpan",
    label: "Span",
    section: "alignment",
    keywords: ["grid", "span", "column", "row"],
    showWhen: isGrid,
    sortOrder: 200,
    input: {
      type: "bundle",
      icon: React.createElement(TbGridScan, { className: "size-3.5" }),
      properties: [
        {
          id: "gridColSpan",
          label: "Col Span",
          section: "alignment",
          keywords: ["grid", "column", "span"],
          input: { type: "tailwind-select", tailwindKey: "gridColSpan" },
          inline: true,
        },
        {
          id: "gridRowSpan",
          label: "Row Span",
          section: "alignment",
          keywords: ["grid", "row", "span"],
          input: { type: "tailwind-select", tailwindKey: "gridRowSpan" },
          inline: true,
        },
      ],
    },
  },

  // ─── Place (advanced, visible when grid) ─────────────────────────
  {
    id: "place",
    label: "Place",
    section: "alignment",
    keywords: ["place", "items", "self", "grid"],
    showWhen: isGrid,
    sortOrder: 220,
    input: {
      type: "bundle",
      icon: React.createElement(TbGridDots, { className: "size-3.5" }),
      properties: [
        {
          id: "placeItems",
          label: "Items",
          section: "alignment",
          keywords: ["place", "items", "grid"],
          input: { type: "tailwind-radio", tailwindKey: "placeItems", cols: true },
          inline: true,
        },
        {
          id: "placeSelf",
          label: "Self",
          section: "alignment",
          keywords: ["place", "self", "grid"],
          input: { type: "tailwind-radio", tailwindKey: "placeSelf", cols: true },
          inline: true,
        },
      ],
    },
  },
];
