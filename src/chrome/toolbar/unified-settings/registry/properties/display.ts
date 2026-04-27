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
import {
  TbBorderInner,
  TbBoxPadding,
  TbList,
  TbPageBreak,
  TbSquare,
  TbTable,
  TbVectorTriangle,
} from "react-icons/tb";
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
    section: "styles",
    keywords: ["float", "left", "right", "none", "clear"],
    input: { type: "tailwind-select", tailwindKey: "float" },
    sortOrder: 103,
  },
  {
    id: "verticalAlign",
    label: "Vertical Align",
    section: "typography",
    keywords: ["vertical", "align", "baseline", "top", "middle", "bottom"],
    input: { type: "tailwind-select", tailwindKey: "verticalAlign" },
    sortOrder: 104,
  },
  {
    id: "fontSmoothing",
    label: "Font Smoothing",
    section: "typography",
    keywords: ["smoothing", "antialiased", "subpixel", "rendering"],
    input: { type: "tailwind-select", tailwindKey: "fontSmoothing" },
    sortOrder: 105,
  },
  {
    id: "resize",
    label: "Resize",
    section: "styles",
    keywords: ["resize", "drag", "handle", "grow"],
    input: { type: "tailwind-select", tailwindKey: "resize" },
    sortOrder: 110,
  },
  {
    id: "touchAction",
    label: "Touch Action",
    section: "styles",
    keywords: ["touch", "action", "pan", "pinch", "zoom"],
    input: { type: "tailwind-select", tailwindKey: "touchAction" },
    sortOrder: 111,
  },
  {
    id: "cssAppearance",
    label: "Appearance",
    section: "styles",
    keywords: ["appearance", "native", "none", "auto"],
    input: { type: "tailwind-select", tailwindKey: "appearance" },
    propKey: "appearance",
    sortOrder: 112,
  },

  // ─── Advanced: CSS ───────────────────────────────────────────────
  {
    id: "boxSizing",
    label: "Box Sizing",
    section: "size",
    keywords: ["box", "sizing", "border-box", "content-box"],
    input: { type: "tailwind-select", tailwindKey: "boxSizing" },
    sortOrder: 200,
  },
  {
    id: "isolation",
    label: "Isolation",
    section: "styles",
    keywords: ["isolation", "isolate", "stacking"],
    input: { type: "tailwind-select", tailwindKey: "isolation" },
    sortOrder: 201,
  },
  {
    id: "columns",
    label: "Columns",
    section: "styles",
    keywords: ["columns", "multi-column", "newspaper"],
    input: { type: "tailwind-select", tailwindKey: "columns" },
    sortOrder: 202,
  },

  // ─── Advanced: Page Breaks (bundle) ──────────────────────────────
  {
    id: "break",
    label: "Break",
    section: "styles",
    keywords: ["break", "before", "inside", "after", "page", "column", "avoid"],
    sortOrder: 203,
    input: {
      type: "bundle",
      icon: React.createElement(TbPageBreak, { className: "size-3.5" }),
      properties: [
        {
          id: "breakBefore",
          label: "Before",
          section: "styles",
          keywords: ["break", "before", "page", "column"],
          input: { type: "tailwind-select", tailwindKey: "breakBefore" },
          inline: true,
        },
        {
          id: "breakInside",
          label: "Inside",
          section: "styles",
          keywords: ["break", "inside", "avoid"],
          input: { type: "tailwind-select", tailwindKey: "breakInside" },
          inline: true,
        },
        {
          id: "breakAfter",
          label: "After",
          section: "styles",
          keywords: ["break", "after", "page", "column"],
          input: { type: "tailwind-select", tailwindKey: "breakAfter" },
          inline: true,
        },
      ],
    },
  },

  // ─── Advanced: List (bundle) ─────────────────────────────────────
  {
    id: "list",
    label: "List",
    section: "typography",
    keywords: ["list", "style", "position", "disc", "decimal", "inside", "outside"],
    sortOrder: 206,
    input: {
      type: "bundle",
      icon: React.createElement(TbList, { className: "size-3.5" }),
      properties: [
        {
          id: "listStyleType",
          label: "Style",
          section: "typography",
          keywords: ["list", "style", "disc", "decimal", "none"],
          input: { type: "tailwind-select", tailwindKey: "listStyleType" },
          inline: true,
        },
        {
          id: "listStylePosition",
          label: "Position",
          section: "typography",
          keywords: ["list", "position", "inside", "outside"],
          input: { type: "tailwind-select", tailwindKey: "listStylePosition" },
          inline: true,
        },
      ],
    },
  },

  // ─── Advanced: Table (bundle) ────────────────────────────────────
  {
    id: "table",
    label: "Table",
    section: "styles",
    keywords: ["table", "layout", "auto", "fixed", "caption", "side"],
    sortOrder: 208,
    input: {
      type: "bundle",
      icon: React.createElement(TbTable, { className: "size-3.5" }),
      properties: [
        {
          id: "tableLayout",
          label: "Layout",
          section: "styles",
          keywords: ["table", "layout", "auto", "fixed"],
          input: { type: "tailwind-select", tailwindKey: "tableLayout" },
          inline: true,
        },
        {
          id: "captionSide",
          label: "Caption Side",
          section: "styles",
          keywords: ["caption", "side", "top", "bottom"],
          input: { type: "tailwind-select", tailwindKey: "captionSide" },
          inline: true,
        },
      ],
    },
  },

  // ─── Advanced: SVG (bundle) ──────────────────────────────────────
  {
    id: "svg",
    label: "SVG",
    section: "styles",
    keywords: ["svg", "fill", "stroke", "width", "color", "icon", "outline", "thickness"],
    sortOrder: 212,
    input: {
      type: "bundle",
      icon: React.createElement(TbVectorTriangle, { className: "size-3.5" }),
      properties: [
        {
          id: "fill",
          label: "Fill",
          section: "styles",
          keywords: ["svg", "fill", "color", "icon"],
          input: { type: "tailwind-select", tailwindKey: "fill" },
          inline: true,
        },
        {
          id: "stroke",
          label: "Stroke",
          section: "styles",
          keywords: ["svg", "stroke", "outline", "icon"],
          input: { type: "tailwind-select", tailwindKey: "stroke" },
          inline: true,
        },
        {
          id: "strokeWidth",
          label: "Width",
          section: "styles",
          keywords: ["svg", "stroke", "width", "thickness"],
          input: { type: "tailwind-select", tailwindKey: "strokeWidth" },
          inline: true,
        },
      ],
    },
  },

  // ─── Advanced: Other ─────────────────────────────────────────────
  {
    id: "cssContent",
    label: "Content",
    section: "styles",
    keywords: ["content", "pseudo", "before", "after"],
    input: { type: "tailwind-select", tailwindKey: "content" },
    propKey: "content",
    sortOrder: 210,
  },
  {
    id: "srOnly",
    label: "Screen Reader",
    section: "aria",
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
