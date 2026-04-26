/**
 * Interactions property definitions.
 *
 * "action" section — custom ActionInput component
 * "hover" section — standard color/opacity/transform defs
 */
import type { PropertyDef } from "../propertyDefs";
import type { ValueType } from "../../../inputs/universal-input/types";

const HOVER_TYPES: ValueType[] = ["tailwind", "calc"];

export const interactionProperties: PropertyDef[] = [
  // ─── Action (custom) ─────────────────────────────────────────────
  {
    id: "action",
    label: "Action",
    section: "action",
    keywords: [
      "action",
      "click",
      "link",
      "url",
      "scroll",
      "modal",
      "email",
      "phone",
      "download",
      "cart",
    ],
    input: { type: "custom", component: "ActionInput" },
    sortOrder: 0,
  },

  // ─── Hover (ordered by frequency of use) ──────────────────────────
  {
    id: "hover.background",
    label: "Background",
    section: "hover",
    keywords: ["hover", "background", "bg", "color"],
    input: { type: "color", prefix: "bg" },
    propKey: "background",
    propType: "component",
    index: "hover",
    sortOrder: 0,
    inline: true,
  },
  {
    id: "hover.textColor",
    label: "Text",
    section: "hover",
    keywords: ["hover", "text", "color", "font"],
    input: { type: "color", prefix: "text" },
    propKey: "color",
    propType: "component",
    index: "hover",
    sortOrder: 1,
    inline: true,
  },
  {
    id: "hover.borderColor",
    label: "Border",
    section: "hover",
    keywords: ["hover", "border", "color", "stroke"],
    input: { type: "color", prefix: "border" },
    propKey: "borderColor",
    index: "hover",
    sortOrder: 2,
    inline: true,
  },
  {
    id: "hover.scale",
    label: "Scale",
    section: "hover",
    keywords: ["hover", "scale", "zoom", "grow", "shrink"],
    input: {
      type: "universal",
      propTag: "scale",
      allowedTypes: HOVER_TYPES,
      showVarSelector: true,
    },
    propKey: "scale",
    index: "hover",
    sortOrder: 10,
    inline: true,
  },
  {
    id: "hover.shadow",
    label: "Shadow",
    section: "hover",
    keywords: ["hover", "shadow", "elevation", "depth"],
    input: {
      type: "universal",
      propTag: "shadow",
      allowedTypes: HOVER_TYPES,
      showVarSelector: true,
    },
    propKey: "shadow",
    index: "hover",
    sortOrder: 11,
    inline: true,
  },
  {
    id: "hover.opacity",
    label: "Opacity",
    section: "hover",
    keywords: ["hover", "opacity", "fade", "transparent"],
    input: {
      type: "universal",
      propTag: "opacity",
      allowedTypes: ["tailwind", "calc", "%"],
      showVarSelector: true,
    },
    propKey: "opacity",
    propType: "root",
    index: "hover",
    sortOrder: 12,
    inline: true,
  },
  {
    id: "hover.translateY",
    label: "Translate Y",
    section: "hover",
    keywords: ["hover", "translate", "move", "lift", "y"],
    input: {
      type: "universal",
      propTag: "translate-y",
      allowedTypes: HOVER_TYPES,
      showVarSelector: true,
    },
    propKey: "translateY",
    index: "hover",
    sortOrder: 13,
    inline: true,
  },
  {
    id: "hover.ring",
    label: "Ring",
    section: "hover",
    keywords: ["hover", "ring", "focus", "outline"],
    input: { type: "universal", propTag: "ring", allowedTypes: HOVER_TYPES, showVarSelector: true },
    propKey: "ringWidth",
    index: "hover",
    sortOrder: 14,
    inline: true,
  },
];
