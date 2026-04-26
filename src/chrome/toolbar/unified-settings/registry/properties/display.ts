/**
 * Display property definitions + Custom CSS section.
 *
 * Main: display, position, cursor, overflow, z-index, order
 * Position offsets: only when absolute/fixed/sticky
 * Advanced: visibility, pointer events, user select, float, vertical align,
 *           font smoothing, interactivity, CSS utilities
 * Custom CSS: own section (className code editor)
 */
import React from "react";
import { TbBorderInner, TbBoxPadding, TbSquare } from "react-icons/tb";
import type { PropertyDef } from "../propertyDefs";
import type { ValueType } from "../../../inputs/universal-input/types";

const OFFSET_TYPES: ValueType[] = ["tailwind", "calc", "px", "%", "em", "rem", "vw", "vh"];

const CURSOR_OPTIONS: string[] = [
  "cursor-auto",
  "cursor-default",
  "cursor-pointer",
  "cursor-wait",
  "cursor-text",
  "cursor-move",
  "cursor-not-allowed",
  "cursor-grab",
  "cursor-grabbing",
  "cursor-help",
  "cursor-none",
  "cursor-context-menu",
  "cursor-progress",
  "cursor-cell",
  "cursor-crosshair",
  "cursor-vertical-text",
  "cursor-alias",
  "cursor-copy",
  "cursor-no-drop",
  "cursor-all-scroll",
  "cursor-col-resize",
  "cursor-row-resize",
  "cursor-n-resize",
  "cursor-e-resize",
  "cursor-s-resize",
  "cursor-w-resize",
  "cursor-ne-resize",
  "cursor-nw-resize",
  "cursor-se-resize",
  "cursor-sw-resize",
  "cursor-ew-resize",
  "cursor-ns-resize",
  "cursor-nesw-resize",
  "cursor-nwse-resize",
  "cursor-zoom-in",
  "cursor-zoom-out",
];

/** Position offsets only show when position is absolute, fixed, or sticky */
const hasPositioning = (className: string) => /\b(absolute|fixed|sticky)\b/.test(className);

export const displayProperties: PropertyDef[] = [
  // ─── Main ────────────────────────────────────────────────────────
  {
    id: "display",
    label: "Display",
    section: "display",
    keywords: ["display", "block", "flex", "grid", "inline", "hidden", "none"],
    input: {
      type: "universal",
      propTag: "block",
      allowedTypes: ["tailwind", "calc"],
      showVarSelector: true,
    },
    sortOrder: 0,
  },
  {
    id: "position",
    label: "Position",
    section: "display",
    keywords: ["position", "relative", "absolute", "fixed", "sticky", "static"],
    input: {
      type: "universal",
      propTag: "relative",
      allowedTypes: ["tailwind", "calc"],
      showVarSelector: true,
    },
    sortOrder: 1,
  },
  {
    id: "cursor",
    label: "Cursor",
    section: "styles",
    keywords: ["cursor", "pointer", "grab", "default", "not-allowed", "wait", "move"],
    input: {
      type: "universal",
      propTag: "cursor",
      tailwindOptions: CURSOR_OPTIONS,
      allowedTypes: ["tailwind", "calc"],
      showVarSelector: true,
    },
    hideKey: "cursor",
    sortOrder: 200,
    inline: true,
  },
  {
    id: "overflow",
    label: "Overflow",
    section: "styles",
    keywords: ["overflow", "hidden", "scroll", "auto", "clip", "visible"],
    input: {
      type: "universal",
      propTag: "overflow",
      tailwindKey: "overflow",
      allowedTypes: ["tailwind", "calc"],
      showVarSelector: true,
    },
    sortOrder: 80,
  },
  {
    id: "zIndex",
    label: "Z-Index",
    section: "styles",
    keywords: ["z-index", "z", "layer", "stack", "depth", "order"],
    input: {
      type: "universal",
      propTag: "z",
      tailwindKey: "zIndex",
      allowedTypes: ["tailwind", "calc"],
      showVarSelector: true,
    },
    sortOrder: 220,
    inline: true,
  },
  {
    id: "order",
    label: "Order",
    section: "display",
    keywords: ["order", "flex", "grid", "position", "sequence"],
    input: { type: "tailwind-select", tailwindKey: "order" },
    sortOrder: 5,
    inline: true,
  },

  // ─── Position offsets (only when absolute/fixed/sticky) ──────────
  {
    id: "inset",
    label: "Inset",
    section: "display",
    keywords: ["inset", "all", "offset", "position", "top", "right", "bottom", "left"],
    input: {
      type: "shorthand",
      varSelectorPrefix: "inset",
      allowedTypes: [...OFFSET_TYPES],
      modes: [
        {
          id: "uniform",
          icon: React.createElement(TbSquare, { className: "size-3.5" }),
          ariaLabel: "Uniform inset",
          tags: ["inset"],
          labels: [""],
        },
        {
          id: "axes",
          icon: React.createElement(TbBoxPadding, { className: "size-3.5" }),
          ariaLabel: "Inset X & Y",
          tags: ["inset-x", "inset-y"],
          labels: ["X", "Y"],
        },
        {
          id: "sides",
          icon: React.createElement(TbBorderInner, { className: "size-3.5" }),
          ariaLabel: "Inset per-side",
          tags: ["top", "right", "bottom", "left"],
          labels: ["T", "R", "B", "L"],
          tailwindKeys: ["top", "right", "bottom", "left"],
          columns: 2,
        },
      ],
    },
    showWhen: hasPositioning,
    sortOrder: 10,
  },

  // ─── Behavior (styles section) ───────────────────────────────────
  {
    id: "visibility",
    label: "Visibility",
    section: "styles",
    keywords: ["visibility", "visible", "invisible", "hidden", "collapse"],
    input: { type: "tailwind-select", tailwindKey: "visibility" },
    sortOrder: 75,
  },
  {
    id: "pointerEvents",
    label: "Pointer Events",
    section: "styles",
    keywords: ["pointer", "events", "click", "none", "auto"],
    input: { type: "tailwind-select", tailwindKey: "pointerEvents" },
    sortOrder: 210,
  },
  {
    id: "userSelect",
    label: "User Select",
    section: "styles",
    keywords: ["user", "select", "text", "selection", "none", "all"],
    input: { type: "tailwind-select", tailwindKey: "userSelect" },
    sortOrder: 215,
  },
  {
    id: "float",
    label: "Float",
    section: "display",
    keywords: ["float", "left", "right", "none", "clear"],
    input: { type: "tailwind-select", tailwindKey: "float" },
    sortOrder: 103,
  },
  {
    id: "verticalAlign",
    label: "Vertical Align",
    section: "display",
    keywords: ["vertical", "align", "baseline", "top", "middle", "bottom"],
    input: { type: "tailwind-select", tailwindKey: "verticalAlign" },
    sortOrder: 104,
  },
  {
    id: "fontSmoothing",
    label: "Font Smoothing",
    section: "display",
    keywords: ["smoothing", "antialiased", "subpixel", "rendering"],
    input: { type: "tailwind-select", tailwindKey: "fontSmoothing" },
    sortOrder: 105,
  },
  {
    id: "resize",
    label: "Resize",
    section: "display",
    keywords: ["resize", "drag", "handle", "grow"],
    input: { type: "tailwind-select", tailwindKey: "resize" },
    sortOrder: 110,
  },
  {
    id: "touchAction",
    label: "Touch Action",
    section: "display",
    keywords: ["touch", "action", "pan", "pinch", "zoom"],
    input: { type: "tailwind-select", tailwindKey: "touchAction" },
    sortOrder: 111,
  },
  {
    id: "cssAppearance",
    label: "Appearance",
    section: "display",
    keywords: ["appearance", "native", "none", "auto"],
    input: { type: "tailwind-select", tailwindKey: "appearance" },
    propKey: "appearance",
    sortOrder: 112,
  },

  // ─── Advanced: CSS ───────────────────────────────────────────────
  {
    id: "boxSizing",
    label: "Box Sizing",
    section: "display",
    keywords: ["box", "sizing", "border-box", "content-box"],
    input: { type: "tailwind-select", tailwindKey: "boxSizing" },
    sortOrder: 200,
  },
  {
    id: "isolation",
    label: "Isolation",
    section: "display",
    keywords: ["isolation", "isolate", "stacking"],
    input: { type: "tailwind-select", tailwindKey: "isolation" },
    sortOrder: 201,
  },
  {
    id: "columns",
    label: "Columns",
    section: "display",
    keywords: ["columns", "multi-column", "newspaper"],
    input: { type: "tailwind-select", tailwindKey: "columns" },
    sortOrder: 202,
  },

  // ─── Advanced: Page Breaks ───────────────────────────────────────
  {
    id: "breakBefore",
    label: "Before",
    section: "display",
    keywords: ["break", "before", "page", "column"],
    input: { type: "tailwind-select", tailwindKey: "breakBefore" },
    sortOrder: 203,
  },
  {
    id: "breakInside",
    label: "Inside",
    section: "display",
    keywords: ["break", "inside", "avoid"],
    input: { type: "tailwind-select", tailwindKey: "breakInside" },
    sortOrder: 204,
  },
  {
    id: "breakAfter",
    label: "After",
    section: "display",
    keywords: ["break", "after", "page", "column"],
    input: { type: "tailwind-select", tailwindKey: "breakAfter" },
    sortOrder: 205,
  },

  // ─── Advanced: List ──────────────────────────────────────────────
  {
    id: "listStyleType",
    label: "Style",
    section: "display",
    keywords: ["list", "style", "disc", "decimal", "none"],
    input: { type: "tailwind-select", tailwindKey: "listStyleType" },
    sortOrder: 206,
  },
  {
    id: "listStylePosition",
    label: "Position",
    section: "display",
    keywords: ["list", "position", "inside", "outside"],
    input: { type: "tailwind-select", tailwindKey: "listStylePosition" },
    sortOrder: 207,
  },

  // ─── Advanced: Table ─────────────────────────────────────────────
  {
    id: "tableLayout",
    label: "Layout",
    section: "display",
    keywords: ["table", "layout", "auto", "fixed"],
    input: { type: "tailwind-select", tailwindKey: "tableLayout" },
    sortOrder: 208,
  },
  {
    id: "captionSide",
    label: "Caption Side",
    section: "display",
    keywords: ["caption", "side", "top", "bottom"],
    input: { type: "tailwind-select", tailwindKey: "captionSide" },
    sortOrder: 209,
  },

  // ─── Advanced: SVG ───────────────────────────────────────────────
  {
    id: "fill",
    label: "Fill",
    section: "display",
    keywords: ["svg", "fill", "color", "icon"],
    input: { type: "tailwind-select", tailwindKey: "fill" },
    sortOrder: 212,
  },
  {
    id: "stroke",
    label: "Stroke",
    section: "display",
    keywords: ["svg", "stroke", "outline", "icon"],
    input: { type: "tailwind-select", tailwindKey: "stroke" },
    sortOrder: 213,
  },
  {
    id: "strokeWidth",
    label: "Width",
    section: "display",
    keywords: ["svg", "stroke", "width", "thickness"],
    input: { type: "tailwind-select", tailwindKey: "strokeWidth" },
    sortOrder: 214,
  },

  // ─── Advanced: Other ─────────────────────────────────────────────
  {
    id: "cssContent",
    label: "Content",
    section: "display",
    keywords: ["content", "pseudo", "before", "after"],
    input: { type: "tailwind-select", tailwindKey: "content" },
    propKey: "content",
    sortOrder: 210,
  },
  {
    id: "srOnly",
    label: "Screen Reader",
    section: "display",
    keywords: ["screen", "reader", "sr-only", "accessibility", "hidden"],
    input: { type: "tailwind-select", tailwindKey: "srOnly" },
    sortOrder: 211,
  },

  // ─── Custom CSS (own section in Advanced tab) ────────────────────
  {
    id: "className",
    label: "Custom CSS",
    section: "custom-css",
    keywords: ["css", "class", "className", "tailwind", "custom", "code"],
    input: { type: "custom", component: "ClassNameInput" },
    sortOrder: 0,
  },
];
