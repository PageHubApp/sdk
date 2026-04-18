/**
 * Appearance / Border / Ring & Outline property definitions.
 *
 * Appearance section — shadow + opacity (visual polish)
 * Border section — border width/style/color/radius (main) + per-side + divide (advanced)
 * Ring & Outline section — ring + outline width/color (main) + offsets + outline style (advanced)
 */
import React from "react";
import { LoadingBarSuspenseFallback } from "../../../../primitives/LoadingBar";
import type { PropertyDef } from "../propertyDefs";
import type { ValueType } from "../../../inputs/universal-input/types";

const LazyBorderSidesPicker = React.lazy(() =>
  import("../../../inputs/border/BorderSidesPicker").then(m => ({ default: m.BorderSidesPicker }))
);

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
      type: "universal",
      propTag: "rounded",
      allowedTypes: ["tailwind", "calc", "px", "em", "rem", "%"],
      showVarSelector: true,
    },
    hideKey: "radius",
    sortOrder: 3,
    inline: true,
  },

  // ─── Border — advanced (per-side + divide) ───────────────────────
  {
    id: "borderSides",
    label: "",
    section: "border",
    keywords: ["border", "top", "bottom", "left", "right", "side", "per-side"],
    input: {
      type: "custom",
      component: () =>
        React.createElement(
          React.Suspense,
          { fallback: React.createElement(LoadingBarSuspenseFallback) },
          React.createElement(LazyBorderSidesPicker)
        ),
    },
    hideKey: "border",
    advancedGroup: "border-side",
    sortOrder: 110,
  },
  {
    id: "divideX",
    label: "X",
    section: "border",
    keywords: ["divide", "horizontal", "separator", "x"],
    input: { type: "tailwind-select", tailwindKey: "divideX" },
    advancedGroup: "divide",
    sortOrder: 140,
  },
  {
    id: "divideY",
    label: "Y",
    section: "border",
    keywords: ["divide", "vertical", "separator", "y"],
    input: { type: "tailwind-select", tailwindKey: "divideY" },
    advancedGroup: "divide",
    sortOrder: 141,
  },
  {
    id: "divideStyle",
    label: "Style",
    section: "border",
    keywords: ["divide", "style", "solid", "dashed", "dotted"],
    input: { type: "tailwind-select", tailwindKey: "divideStyle" },
    advancedGroup: "divide",
    sortOrder: 142,
  },
  {
    id: "divideColor",
    label: "Color",
    section: "border",
    keywords: ["divide", "color", "separator"],
    input: { type: "color", prefix: "divide" },
    advancedGroup: "divide",
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
    advancedGroup: "ring",
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
    showWhen: className => {
      if (!className) return false;
      return className.split(/\s+/).some(c => {
        const raw = c.replace(/^(sm:|md:|lg:|xl:|2xl:|hover:)/, "");
        return raw.startsWith("ring") && !raw.startsWith("ring-offset");
      });
    },
    advancedGroup: "ring",
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
    advancedGroup: "ring",
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
    advancedGroup: "outline",
    sortOrder: 0,
    inline: true,
  },
  {
    id: "outlineColor",
    label: "Color",
    section: "ring-outline",
    keywords: ["outline", "color"],
    input: { type: "color", prefix: "outline" },
    hideKey: "ringOutline",
    showWhen: className => {
      if (!className) return false;
      return className.split(/\s+/).some(c => {
        const raw = c.replace(/^(sm:|md:|lg:|xl:|2xl:|hover:)/, "");
        return raw.startsWith("outline") && !raw.startsWith("outline-offset");
      });
    },
    advancedGroup: "outline",
    sortOrder: 1,
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
    advancedGroup: "outline",
    sortOrder: 2,
    inline: true,
  },
  {
    id: "outlineStyle",
    label: "Style",
    section: "ring-outline",
    keywords: ["outline", "style", "solid", "dashed", "dotted"],
    input: { type: "tailwind-select", tailwindKey: "outlineStyle" },
    hideKey: "ringOutline",
    advancedGroup: "outline",
    sortOrder: 3,
  },
];
