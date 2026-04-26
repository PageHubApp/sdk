/**
 * Appearance / Border / Ring & Outline property definitions.
 *
 * Appearance section — shadow + opacity (visual polish)
 * Border section — border width/style/color/radius (main) + per-side + divide (advanced)
 * Ring & Outline section — ring + outline width/color (main) + offsets + outline style (advanced)
 */
import React from "react";
import { TbBorderCorners, TbSquare } from "react-icons/tb";
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

export const appearanceProperties: PropertyDef[] = [
  // ─── Appearance (shadow + opacity) ───────────────────────────────
  {
    id: "shadow",
    label: "Shadow",
    section: "appearance",
    keywords: ["shadow", "drop", "box", "elevation", "depth"],
    input: {
      type: "universal",
      propTag: "shadow",
      allowedTypes: ["tailwind", "calc"],
      showVarSelector: true,
    },
    hideKey: "shadow",
    sortOrder: 0,
    inline: true,
  },
  {
    id: "opacity",
    label: "Opacity",
    section: "appearance",
    keywords: ["opacity", "transparent", "alpha", "visibility", "fade"],
    input: {
      type: "universal",
      propTag: "opacity",
      allowedTypes: ["tailwind", "calc", "%"],
      showVarSelector: true,
    },
    hideKey: "opacity",
    sortOrder: 1,
    inline: true,
  },

  // ─── Border — main ───────────────────────────────────────────────
  {
    id: "border",
    label: "Width",
    section: "border",
    keywords: ["border", "width", "size", "stroke", "thickness"],
    input: { type: "tailwind-select", tailwindKey: "border", showVarSelector: true },
    hideKey: "border",
    sortOrder: 0,
    inline: true,
  },
  {
    id: "borderStyle",
    label: "Style",
    section: "border",
    keywords: ["style", "solid", "dashed", "dotted", "double", "none"],
    input: { type: "tailwind-select", tailwindKey: "borderStyle" },
    hideKey: "border",
    sortOrder: 1,
    inline: true,
  },
  {
    id: "borderColor",
    label: "Color",
    section: "border",
    keywords: ["border", "color", "stroke"],
    input: { type: "color", prefix: "border" },
    hideKey: "border",
    showWhen: className => /\bborder(-[^\s])?/.test(className),
    sortOrder: 2,
    inline: true,
  },
  {
    id: "borderRadius",
    label: "Radius",
    section: "border",
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
    pinned: true,
    sortOrder: 3,
  },

  // ─── Border — advanced (per-side + divide) ───────────────────────
  {
    id: "borderSides",
    label: "",
    section: "border",
    keywords: ["border", "top", "bottom", "left", "right", "side", "per-side"],
    input: { type: "custom", component: "BorderSidesPicker" },
    hideKey: "border",
    sortOrder: 110,
  },
  {
    id: "divideX",
    label: "X",
    section: "border",
    keywords: ["divide", "horizontal", "separator", "x"],
    input: { type: "tailwind-select", tailwindKey: "divideX" },
    sortOrder: 140,
  },
  {
    id: "divideY",
    label: "Y",
    section: "border",
    keywords: ["divide", "vertical", "separator", "y"],
    input: { type: "tailwind-select", tailwindKey: "divideY" },
    sortOrder: 141,
  },
  {
    id: "divideStyle",
    label: "Style",
    section: "border",
    keywords: ["divide", "style", "solid", "dashed", "dotted"],
    input: { type: "tailwind-select", tailwindKey: "divideStyle" },
    sortOrder: 142,
  },
  {
    id: "divideColor",
    label: "Color",
    section: "border",
    keywords: ["divide", "color", "separator"],
    input: { type: "color", prefix: "divide" },
    sortOrder: 143,
    inline: true,
  },

  // ─── Ring sub-section ────────────────────────────────────────────
  {
    id: "ringWidth",
    label: "Width",
    section: "ring-outline",
    keywords: ["ring", "width", "focus", "outline"],
    input: {
      type: "universal",
      propTag: "ring",
      allowedTypes: RING_OUTLINE_TYPES,
      showVarSelector: true,
    },
    hideKey: "ringOutline",
    groupLabel: "Ring",
    sortOrder: 0,
    inline: true,
  },
  {
    id: "ringColor",
    label: "Color",
    section: "ring-outline",
    keywords: ["ring", "color", "focus"],
    input: { type: "color", prefix: "ring" },
    hideKey: "ringOutline",
    groupLabel: "Ring",
    showWhen: className => {
      if (!className) return false;
      return className.split(/\s+/).some(c => {
        const raw = c.replace(/^(sm:|md:|lg:|xl:|2xl:|hover:)/, "");
        return raw.startsWith("ring") && !raw.startsWith("ring-offset");
      });
    },
    sortOrder: 1,
    inline: true,
  },
  {
    id: "ringOffsetWidth",
    label: "Offset",
    section: "ring-outline",
    keywords: ["ring", "offset", "gap"],
    input: {
      type: "universal",
      propTag: "ring-offset",
      allowedTypes: RING_OUTLINE_TYPES,
      showVarSelector: true,
    },
    hideKey: "ringOutline",
    groupLabel: "Ring",
    sortOrder: 2,
    inline: true,
  },

  // ─── Outline sub-section ─────────────────────────────────────────
  {
    id: "outlineWidth",
    label: "Width",
    section: "ring-outline",
    keywords: ["outline", "width", "border"],
    input: {
      type: "universal",
      propTag: "outline",
      allowedTypes: RING_OUTLINE_TYPES,
      showVarSelector: true,
    },
    hideKey: "ringOutline",
    groupLabel: "Outline",
    sortOrder: 10,
    inline: true,
  },
  {
    id: "outlineColor",
    label: "Color",
    section: "ring-outline",
    keywords: ["outline", "color"],
    input: { type: "color", prefix: "outline" },
    hideKey: "ringOutline",
    groupLabel: "Outline",
    showWhen: className => {
      if (!className) return false;
      return className.split(/\s+/).some(c => {
        const raw = c.replace(/^(sm:|md:|lg:|xl:|2xl:|hover:)/, "");
        return raw.startsWith("outline") && !raw.startsWith("outline-offset");
      });
    },
    sortOrder: 11,
    inline: true,
  },
  {
    id: "outlineOffset",
    label: "Offset",
    section: "ring-outline",
    keywords: ["outline", "offset", "gap"],
    input: {
      type: "universal",
      propTag: "outline-offset",
      allowedTypes: RING_OUTLINE_TYPES,
      showVarSelector: true,
    },
    hideKey: "ringOutline",
    groupLabel: "Outline",
    sortOrder: 12,
    inline: true,
  },
  {
    id: "outlineStyle",
    label: "Style",
    section: "ring-outline",
    keywords: ["outline", "style", "solid", "dashed", "dotted"],
    input: { type: "tailwind-select", tailwindKey: "outlineStyle" },
    hideKey: "ringOutline",
    groupLabel: "Outline",
    sortOrder: 13,
  },
];
