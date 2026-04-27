/**
 * Appearance / Border / Ring & Outline property definitions.
 *
 * Appearance section — shadow + opacity (visual polish)
 * Border section — border width/style/color/radius (main) + per-side + divide (advanced)
 * Ring & Outline section — ring + outline width/color (main) + offsets + outline style (advanced)
 */
import React from "react";
import {
  TbBorderCorners,
  TbBorderInner,
  TbBoxPadding,
  TbSquare,
} from "react-icons/tb";
import type { PropertyDef } from "../propertyDefs";
import type { ValueType } from "../../../inputs/universal-input/types";

const RING_OUTLINE_TYPES: ValueType[] = [
  "tailwind",
  "calc",
  "px",
  "%",
  "em",
  "rem",
  "vw",
  "vh",
  "vmin",
  "vmax",
];

const BORDER_WIDTH_TYPES: ValueType[] = ["tailwind", "calc", "px"];

export const appearanceProperties: PropertyDef[] = [
  // ─── Appearance (shadow + opacity) ───────────────────────────────
  {
    id: "shadow",
    label: "Shadow",
    section: "styles",
    keywords: ["shadow", "drop", "box", "elevation", "depth"],
    input: {
      type: "universal",
      propTag: "shadow",
      allowedTypes: ["tailwind", "calc"],
      showVarSelector: true,
    },
    hideKey: "shadow",
    sortOrder: 5,
    inline: true,
  },
  {
    id: "opacity",
    label: "Opacity",
    section: "styles",
    keywords: ["opacity", "transparent", "alpha", "visibility", "fade"],
    input: {
      type: "universal",
      propTag: "opacity",
      allowedTypes: ["tailwind", "calc", "%"],
      showVarSelector: true,
    },
    hideKey: "opacity",
    sortOrder: 0,
    inline: true,
  },

  // ─── Border (bundle: chip → popover with Width / Style / Color) ──
  {
    id: "border",
    label: "Border",
    section: "styles",
    keywords: ["border", "width", "style", "color", "stroke", "thickness", "top", "right", "bottom", "left"],
    hideKey: "border",
    sortOrder: 20,
    input: {
      type: "bundle",
      properties: [
        {
          id: "borderWidth",
          label: "Width",
          section: "styles",
          keywords: ["border", "width", "size", "thickness"],
          input: {
            type: "shorthand",
            tailwindKey: "border",
            varSelectorPrefix: "border",
            allowedTypes: [...BORDER_WIDTH_TYPES],
            modes: [
              {
                id: "uniform",
                icon: React.createElement(TbSquare, { className: "size-3.5" }),
                ariaLabel: "Uniform border width",
                tags: ["border"],
                labels: [""],
              },
              {
                id: "axes",
                icon: React.createElement(TbBoxPadding, { className: "size-3.5" }),
                ariaLabel: "Border X & Y",
                tags: ["border-x", "border-y"],
                labels: ["X", "Y"],
              },
              {
                id: "sides",
                icon: React.createElement(TbBorderInner, { className: "size-3.5" }),
                ariaLabel: "Border per-side",
                tags: ["border-t", "border-r", "border-b", "border-l"],
                labels: ["T", "R", "B", "L"],
                columns: 2,
              },
            ],
          },
        },
        {
          id: "borderStyle",
          label: "Style",
          section: "styles",
          keywords: ["style", "solid", "dashed", "dotted", "double", "none"],
          input: { type: "tailwind-select", tailwindKey: "borderStyle" },
          inline: true,
        },
        {
          id: "borderColor",
          label: "Color",
          section: "styles",
          keywords: ["border", "color", "stroke"],
          input: { type: "color", prefix: "border" },
          inline: true,
        },
      ],
    },
  },
  {
    id: "borderRadius",
    label: "Radius",
    section: "styles",
    keywords: ["radius", "rounded", "corners", "border-radius", "pill", "circle"],
    input: {
      type: "shorthand",
      varSelectorPrefix: "rounded",
      allowedTypes: ["tailwind", "calc", "px", "em", "rem", "%"],
      modes: [
        {
          id: "uniform",
          icon: React.createElement(TbSquare, { className: "size-3.5" }),
          ariaLabel: "Uniform radius",
          tags: ["rounded"],
          labels: [""],
        },
        {
          id: "corners",
          icon: React.createElement(TbBorderCorners, { className: "size-3.5" }),
          ariaLabel: "Radius per-corner",
          tags: ["rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"],
          labels: ["TL", "TR", "BR", "BL"],
          columns: 2,
        },
      ],
    },
    hideKey: "radius",
    pinned: false,
    sortOrder: 10,
  },

  // ─── Divide (bundle: chip → popover with X / Y / Style / Color) ─────
  {
    id: "divide",
    label: "Divide",
    section: "styles",
    keywords: ["divide", "separator", "between", "x", "y", "style", "color"],
    sortOrder: 50,
    input: {
      type: "bundle",
      properties: [
        {
          id: "divideX",
          label: "X",
          section: "styles",
          keywords: ["divide", "horizontal", "separator", "x"],
          input: { type: "tailwind-select", tailwindKey: "divideX" },
          inline: true,
        },
        {
          id: "divideY",
          label: "Y",
          section: "styles",
          keywords: ["divide", "vertical", "separator", "y"],
          input: { type: "tailwind-select", tailwindKey: "divideY" },
          inline: true,
        },
        {
          id: "divideStyle",
          label: "Style",
          section: "styles",
          keywords: ["divide", "style", "solid", "dashed", "dotted"],
          input: { type: "tailwind-select", tailwindKey: "divideStyle" },
          inline: true,
        },
        {
          id: "divideColor",
          label: "Color",
          section: "styles",
          keywords: ["divide", "color", "separator"],
          input: { type: "color", prefix: "divide" },
          inline: true,
        },
      ],
    },
  },

  // ─── Ring (bundle: chip → popover with Width / Color / Offset) ───
  {
    id: "ring",
    label: "Ring",
    section: "styles",
    keywords: ["ring", "focus", "width", "color", "offset"],
    hideKey: "ringOutline",
    sortOrder: 30,
    input: {
      type: "bundle",
      properties: [
        {
          id: "ringWidth",
          label: "Width",
          section: "styles",
          keywords: ["ring", "width"],
          input: {
            type: "universal",
            propTag: "ring",
            tailwindKey: "ringWidth",
            allowedTypes: RING_OUTLINE_TYPES,
            showVarSelector: true,
          },
          inline: true,
        },
        {
          id: "ringColor",
          label: "Color",
          section: "styles",
          keywords: ["ring", "color"],
          input: { type: "color", prefix: "ring" },
          inline: true,
        },
        {
          id: "ringOffsetWidth",
          label: "Offset",
          section: "styles",
          keywords: ["ring", "offset"],
          input: {
            type: "universal",
            propTag: "ring-offset",
            tailwindKey: "ringOffsetWidth",
            allowedTypes: RING_OUTLINE_TYPES,
            showVarSelector: true,
          },
          inline: true,
        },
      ],
    },
  },

  // ─── Outline (bundle: chip → popover with Width / Color / Offset / Style) ─
  {
    id: "outline",
    label: "Outline",
    section: "styles",
    keywords: ["outline", "border", "width", "color", "offset", "style"],
    hideKey: "ringOutline",
    sortOrder: 40,
    input: {
      type: "bundle",
      properties: [
        {
          id: "outlineWidth",
          label: "Width",
          section: "styles",
          keywords: ["outline", "width"],
          input: {
            type: "universal",
            propTag: "outline",
            tailwindKey: "outlineWidth",
            allowedTypes: RING_OUTLINE_TYPES,
            showVarSelector: true,
          },
          inline: true,
        },
        {
          id: "outlineColor",
          label: "Color",
          section: "styles",
          keywords: ["outline", "color"],
          input: { type: "color", prefix: "outline" },
          inline: true,
        },
        {
          id: "outlineOffset",
          label: "Offset",
          section: "styles",
          keywords: ["outline", "offset"],
          input: {
            type: "universal",
            propTag: "outline-offset",
            tailwindKey: "outlineOffset",
            allowedTypes: RING_OUTLINE_TYPES,
            showVarSelector: true,
          },
          inline: true,
        },
        {
          id: "outlineStyle",
          label: "Style",
          section: "styles",
          keywords: ["outline", "style"],
          input: { type: "tailwind-select", tailwindKey: "outlineStyle" },
          inline: true,
        },
      ],
    },
  },
];
