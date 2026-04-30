/**
 * Alignment / Layout section — all props split out from the old AlignmentBody.
 * Every prop is always offered (no `showWhen` gate on display mode); picking
 * one writes the class regardless of whether the parent is flex/grid yet, and
 * the user picks a layout from the Layout chip when they want flex/grid to
 * actually take effect.
 */
import React from "react";
import {
  TbAlignBoxCenterStretch,
  TbBaseline,
  TbBoxPadding,
  TbGridDots,
  TbGridScan,
  TbLayoutAlignBottom,
  TbLayoutAlignCenter,
  TbLayoutAlignLeft,
  TbLayoutAlignMiddle,
  TbLayoutAlignRight,
  TbLayoutAlignTop,
  TbLayoutDistributeHorizontal,
  TbSpace,
  TbSpaces,
  TbSpacingHorizontal,
  TbSquare,
} from "react-icons/tb";
import type { PropertyDef } from "../propertyDefs";

const SPACING_TYPES = ["tailwind", "calc", "px", "em", "rem", "%"] as const;

const icoEl = (Cmp: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>) =>
  React.createElement(Cmp, { className: "size-3.5 shrink-0", "aria-hidden": true });

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
    // Slot self-hides for non-container nodes (LayoutPresetSlot returns null
    // when `props.type` is unset). Without this gate the section renders an
    // empty padded body on Text/Image/etc. Mirrors the pattern used by
    // `containerStateWiring` and `modifiers`.
    isActive: (_cls, props) => props?.type != null,
    sortOrder: -10,
  },

  // ─── Flex controls (visible when flex) ───────────────────────────
  {
    id: "flexDirection",
    label: "Direction",
    section: "alignment",
    keywords: ["direction", "row", "column", "flex"],
    input: { type: "custom", component: "FlexDirectionInput" },
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
    sortOrder: 6,
  },
  {
    id: "alignItems",
    label: "Align",
    section: "alignment",
    keywords: ["align", "items", "vertical", "cross"],
    input: {
      type: "tailwind-radio",
      tailwindKey: "alignItems",
      cols: true,
      // Icons match the cross-axis intuition for row-direction flex (the
      // default). Hover tooltips carry the value name. Order: start → center →
      // end → baseline → stretch (visual top-to-bottom + special cases last).
      options: [
        { label: icoEl(TbLayoutAlignTop), value: "items-start", hint: "Start" },
        { label: icoEl(TbLayoutAlignMiddle), value: "items-center", hint: "Center" },
        { label: icoEl(TbLayoutAlignBottom), value: "items-end", hint: "End" },
        { label: icoEl(TbBaseline), value: "items-baseline", hint: "Baseline" },
        { label: icoEl(TbAlignBoxCenterStretch), value: "items-stretch", hint: "Stretch" },
      ],
    },
    sortOrder: 10,
  },
  {
    id: "justifyContent",
    label: "Justify",
    section: "alignment",
    keywords: ["justify", "content", "horizontal", "main"],
    input: {
      type: "tailwind-radio",
      tailwindKey: "justifyContent",
      cols: true,
      // Main-axis distribution. Icons match row-direction intuition; tooltips
      // carry the value name. between/around/evenly all share the same family
      // (no dedicated tabler icons), distinguished by tooltip + slight reuse
      // of TbSpaces vs TbSpace for around/evenly.
      options: [
        { label: icoEl(TbLayoutAlignLeft), value: "justify-start", hint: "Start" },
        { label: icoEl(TbLayoutAlignCenter), value: "justify-center", hint: "Center" },
        { label: icoEl(TbLayoutAlignRight), value: "justify-end", hint: "End" },
        { label: icoEl(TbLayoutDistributeHorizontal), value: "justify-between", hint: "Between" },
        { label: icoEl(TbSpaces), value: "justify-around", hint: "Around" },
        { label: icoEl(TbSpace), value: "justify-evenly", hint: "Evenly" },
      ],
    },
    sortOrder: 11,
  },

  // ─── Flex (advanced — hidden until +Add) ─────────────────────────
  {
    id: "justifyItems",
    label: "Justify Items",
    section: "alignment",
    keywords: ["justify", "items"],
    input: {
      type: "tailwind-radio",
      tailwindKey: "justifyItems",
      cols: true,
      options: [
        { label: icoEl(TbLayoutAlignLeft), value: "justify-items-start", hint: "Start" },
        { label: icoEl(TbLayoutAlignCenter), value: "justify-items-center", hint: "Center" },
        { label: icoEl(TbLayoutAlignRight), value: "justify-items-end", hint: "End" },
        { label: icoEl(TbAlignBoxCenterStretch), value: "justify-items-stretch", hint: "Stretch" },
      ],
    },
    sortOrder: 100,
  },
  {
    id: "alignSelf",
    label: "Align Self",
    section: "alignment",
    keywords: ["align", "self"],
    input: {
      type: "tailwind-radio",
      tailwindKey: "alignSelf",
      cols: true,
      options: [
        { label: icoEl(TbSquare), value: "self-auto", hint: "Auto" },
        { label: icoEl(TbLayoutAlignTop), value: "self-start", hint: "Start" },
        { label: icoEl(TbLayoutAlignMiddle), value: "self-center", hint: "Center" },
        { label: icoEl(TbLayoutAlignBottom), value: "self-end", hint: "End" },
        { label: icoEl(TbBaseline), value: "self-baseline", hint: "Baseline" },
        { label: icoEl(TbAlignBoxCenterStretch), value: "self-stretch", hint: "Stretch" },
      ],
    },
    sortOrder: 110,
  },
  {
    id: "justifySelf",
    label: "Justify Self",
    section: "alignment",
    keywords: ["justify", "self"],
    input: {
      type: "tailwind-radio",
      tailwindKey: "justifySelf",
      cols: true,
      options: [
        { label: icoEl(TbSquare), value: "justify-self-auto", hint: "Auto" },
        { label: icoEl(TbLayoutAlignLeft), value: "justify-self-start", hint: "Start" },
        { label: icoEl(TbLayoutAlignCenter), value: "justify-self-center", hint: "Center" },
        { label: icoEl(TbLayoutAlignRight), value: "justify-self-end", hint: "End" },
        { label: icoEl(TbAlignBoxCenterStretch), value: "justify-self-stretch", hint: "Stretch" },
      ],
    },
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
    sortOrder: 130,
  },

  // gridCols / gridRows are owned by the LayoutPreset picker at the top of
  // this section — no separate bundle here.
  {
    id: "placeContent",
    label: "Place Content",
    section: "alignment",
    keywords: ["place", "content", "grid"],
    input: {
      type: "tailwind-radio",
      tailwindKey: "placeContent",
      cols: true,
      options: [
        { label: icoEl(TbLayoutAlignLeft), value: "place-content-start", hint: "Start" },
        { label: icoEl(TbLayoutAlignCenter), value: "place-content-center", hint: "Center" },
        { label: icoEl(TbLayoutAlignRight), value: "place-content-end", hint: "End" },
        { label: icoEl(TbLayoutDistributeHorizontal), value: "place-content-between", hint: "Between" },
        { label: icoEl(TbSpaces), value: "place-content-around", hint: "Around" },
        { label: icoEl(TbSpace), value: "place-content-evenly", hint: "Evenly" },
        { label: icoEl(TbAlignBoxCenterStretch), value: "place-content-stretch", hint: "Stretch" },
      ],
    },
    sortOrder: 22,
  },

  // ─── Grid span (advanced, visible when grid) ─────────────────────
  {
    id: "gridSpan",
    label: "Span",
    section: "alignment",
    keywords: ["grid", "span", "column", "row"],
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
          input: { type: "universal", tailwindKey: "gridColSpan" },
          inline: true,
        },
        {
          id: "gridRowSpan",
          label: "Row Span",
          section: "alignment",
          keywords: ["grid", "row", "span"],
          input: { type: "universal", tailwindKey: "gridRowSpan" },
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
          input: {
            type: "tailwind-radio",
            tailwindKey: "placeItems",
            cols: true,
            options: [
              { label: icoEl(TbLayoutAlignTop), value: "place-items-start", hint: "Start" },
              { label: icoEl(TbLayoutAlignMiddle), value: "place-items-center", hint: "Center" },
              { label: icoEl(TbLayoutAlignBottom), value: "place-items-end", hint: "End" },
              { label: icoEl(TbBaseline), value: "place-items-baseline", hint: "Baseline" },
              { label: icoEl(TbAlignBoxCenterStretch), value: "place-items-stretch", hint: "Stretch" },
            ],
          },
          inline: true,
        },
        {
          id: "placeSelf",
          label: "Self",
          section: "alignment",
          keywords: ["place", "self", "grid"],
          input: {
            type: "tailwind-radio",
            tailwindKey: "placeSelf",
            cols: true,
            options: [
              { label: icoEl(TbSquare), value: "place-self-auto", hint: "Auto" },
              { label: icoEl(TbLayoutAlignTop), value: "place-self-start", hint: "Start" },
              { label: icoEl(TbLayoutAlignMiddle), value: "place-self-center", hint: "Center" },
              { label: icoEl(TbLayoutAlignBottom), value: "place-self-end", hint: "End" },
              { label: icoEl(TbAlignBoxCenterStretch), value: "place-self-stretch", hint: "Stretch" },
            ],
          },
          inline: true,
        },
      ],
    },
  },
];
