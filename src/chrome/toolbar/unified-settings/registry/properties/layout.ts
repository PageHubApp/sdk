/**
 * Layout property definitions — size only.
 *
 * Alignment is handled by AlignmentBody (custom component in advanced.tsx).
 * Spacing is handled by SpacingBody (custom component in advanced.tsx).
 * Size properties are pure schema.
 */
import type { PropertyDef } from "../propertyDefs";
import type { ValueType } from "../../../inputs/universal-input/types";

const SIZE_TYPES: ValueType[] = ["tailwind", "calc", "px", "%", "em", "rem", "vw", "vh"];

export const layoutProperties: PropertyDef[] = [
  // ─── Size (pure schema) ──────────────────────────────────────────
  {
    id: "width",
    label: "Width",
    section: "size",
    keywords: ["width", "w", "size", "horizontal"],
    input: {
      type: "universal",
      propTag: "w",
      tailwindKey: "allWidths",
      allowedTypes: SIZE_TYPES,
      showVarSelector: true,
    },
    sortOrder: 0,
  },
  {
    id: "height",
    label: "Height",
    section: "size",
    keywords: ["height", "h", "size", "vertical"],
    input: {
      type: "universal",
      propTag: "h",
      tailwindKey: "height",
      allowedTypes: SIZE_TYPES,
      showVarSelector: true,
    },
    sortOrder: 1,
  },
  {
    id: "maxWidth",
    label: "Max Width",
    section: "size",
    keywords: ["max", "width", "maximum", "limit"],
    input: {
      type: "universal",
      propTag: "max-w",
      tailwindKey: "maxWidths",
      allowedTypes: SIZE_TYPES,
      showVarSelector: true,
    },
    sortOrder: 10,
  },
  {
    id: "maxHeight",
    label: "Max Height",
    section: "size",
    keywords: ["max", "height", "maximum", "limit"],
    input: {
      type: "universal",
      propTag: "max-h",
      tailwindKey: "maxHeights",
      allowedTypes: SIZE_TYPES,
      showVarSelector: true,
    },
    sortOrder: 11,
  },
  {
    id: "minWidth",
    label: "Min Width",
    section: "size",
    keywords: ["min", "width", "minimum"],
    input: {
      type: "universal",
      propTag: "min-w",
      tailwindKey: "minWidths",
      allowedTypes: SIZE_TYPES,
      showVarSelector: true,
    },
    sortOrder: 12,
  },
  {
    id: "minHeight",
    label: "Min Height",
    section: "size",
    keywords: ["min", "height", "minimum"],
    input: {
      type: "universal",
      propTag: "min-h",
      tailwindKey: "minHeights",
      allowedTypes: SIZE_TYPES,
      showVarSelector: true,
    },
    sortOrder: 13,
  },
  {
    id: "aspectRatio",
    label: "Aspect Ratio",
    section: "size",
    keywords: ["aspect", "ratio", "square", "video", "16:9", "4:3"],
    input: { type: "tailwind-select", tailwindKey: "aspectRatio" },
    sortOrder: 14,
  },
];
