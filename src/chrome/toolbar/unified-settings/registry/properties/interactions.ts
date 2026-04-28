/**
 * Interactions property definitions.
 *
 * "action" section — custom ActionsInput component (chip list backed by
 * `props.action[]`, see editor-popover-pattern.md §8)
 * "handlers" section — custom HandlersInput component (chip list backed by
 * `props.handlers` map of event name → JS string, see §8)
 * "hover" section — standard color/opacity/transform defs
 */
import type { PropertyDef } from "../propertyDefs";
import type { ValueType } from "../../../inputs/universal-input/types";

const HOVER_TYPES: ValueType[] = ["tailwind", "calc"];

export const interactionProperties: PropertyDef[] = [
  // ─── Action (list-style section, mirrors Conditions) ─────────────
  // Body chip-list. Pinned so AccordionAddMenu's `sectionPopoverProp` path
  // (which requires the picker to be the only NON-pinned prop) can mount the
  // header `+`. `isActive` gates body visibility on the actions array — empty
  // list collapses the section back to "click + to add". Handlers live in
  // their own sibling section (see below). See editor-popover-pattern.md §8.
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
    input: { type: "custom", component: "ActionsInput" },
    pinned: true,
    isActive: (_cls, props) => {
      // `props.action` may be an array (multi-action), single object, or
      // string (form-mode submission URL — not an interaction). Plural
      // `props.actions` survives only for in-flight legacy data.
      const a = props?.action;
      const hasAction =
        (Array.isArray(a) && a.length > 0) || (a && typeof a === "object");
      const hasLegacy =
        (Array.isArray(props?.actions) && props.actions.length > 0) ||
        !!props?.click ||
        !!props?.url;
      return Boolean(hasAction || hasLegacy);
    },
    sortOrder: 0,
  },
  {
    // Section-header `+` picker. Popover-mode + non-pinned, so AccordionAddMenu's
    // `sectionPopoverProp` path mounts it inside the section title row.
    id: "action:add",
    label: "Add action",
    section: "action",
    help: "Add a click / interaction action.",
    keywords: ["add", "action", "link", "modal", "click", "show", "hide", "cart"],
    input: { type: "custom", component: "ActionsAddPicker" },
    sortOrder: 1,
  },

  // ─── Handlers (list-style section, mirrors Conditions / Action) ───
  // Body chip-list of `props.handlers` (event → JS string map). Sibling of
  // Action — declarative typed actions live there, raw JS escape hatch lives
  // here. See editor-popover-pattern.md §8.
  {
    id: "handlers",
    label: "Handlers",
    section: "handlers",
    keywords: [
      "handler",
      "event",
      "javascript",
      "js",
      "code",
      "click",
      "hover",
      "mouseenter",
      "mouseleave",
      "focus",
      "blur",
      "keydown",
      "keyup",
    ],
    input: { type: "custom", component: "HandlersInput" },
    pinned: true,
    isActive: (_cls, props) =>
      props?.handlers &&
      typeof props.handlers === "object" &&
      Object.keys(props.handlers).length > 0,
    sortOrder: 0,
  },
  {
    // Section-header `+` picker. Popover-mode + non-pinned, so AccordionAddMenu's
    // `sectionPopoverProp` path mounts it inside the section title row.
    id: "handlers:add",
    label: "Add handler",
    section: "handlers",
    help: "Add a custom JS handler for a DOM event.",
    keywords: ["add", "handler", "event", "javascript", "js", "code"],
    input: { type: "custom", component: "HandlersAddPicker" },
    sortOrder: 1,
  },

  // ─── Hover (ordered by frequency of use) ──────────────────────────
  // Labels here are explicit ("Background Color", "Text Color") because the
  // Hover section mixes color, layout, and effect properties — we can't lean
  // on a parent "Background" / "Typography" section title for context like
  // the Design-tab equivalents do.
  {
    id: "hover.background",
    label: "Background Color",
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
    label: "Text Color",
    section: "hover",
    keywords: ["hover", "text", "color", "font"],
    input: { type: "color", prefix: "text" },
    propKey: "color",
    propType: "component",
    index: "hover",
    sortOrder: 1,
    inline: true,
  },
  // Border is a multi-field concept (width / style / color) — mirror the base
  // `border` bundle in appearance.ts, scoped to hover via `index: "hover"` so
  // writes go to `hover:border-*` / `hover:border-<style>` / `hover:border-<color>`.
  {
    id: "hover.border",
    label: "Border",
    section: "hover",
    keywords: ["hover", "border", "width", "style", "color", "stroke", "thickness"],
    sortOrder: 2,
    input: {
      type: "bundle",
      properties: [
        {
          id: "hover.borderWidth",
          label: "Width",
          section: "hover",
          keywords: ["hover", "border", "width", "thickness"],
          input: {
            type: "universal",
            propTag: "border",
            tailwindKey: "border",
            allowedTypes: ["tailwind", "calc", "px"],
            showVarSelector: true,
          },
          propKey: "borderWidth",
          index: "hover",
          inline: true,
        },
        {
          id: "hover.borderStyle",
          label: "Style",
          section: "hover",
          keywords: ["hover", "border", "style", "solid", "dashed", "dotted"],
          input: { type: "universal", tailwindKey: "borderStyle" },
          propKey: "borderStyle",
          index: "hover",
          inline: true,
        },
        {
          id: "hover.borderColor",
          label: "Color",
          section: "hover",
          keywords: ["hover", "border", "color", "stroke"],
          input: { type: "color", prefix: "border" },
          propKey: "borderColor",
          index: "hover",
          inline: true,
        },
      ],
    },
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
  // Shadow is a multi-field concept (size + color). Mirrors the base `shadow`
  // bundle in appearance.ts, scoped to hover via `index: "hover"`.
  {
    id: "hover.shadow",
    label: "Shadow",
    section: "hover",
    keywords: ["hover", "shadow", "elevation", "depth", "color"],
    sortOrder: 11,
    input: {
      type: "bundle",
      properties: [
        {
          id: "hover.shadowSize",
          label: "Size",
          section: "hover",
          keywords: ["hover", "shadow", "size", "elevation", "depth"],
          input: {
            type: "universal",
            propTag: "shadow",
            tailwindKey: "shadow",
            allowedTypes: HOVER_TYPES,
            showVarSelector: true,
          },
          propKey: "shadow",
          index: "hover",
          inline: true,
        },
        {
          id: "hover.shadowColor",
          label: "Color",
          section: "hover",
          keywords: ["hover", "shadow", "color", "tint"],
          input: { type: "color", prefix: "shadow" },
          propKey: "shadowColor",
          index: "hover",
          inline: true,
        },
      ],
    },
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
  // Ring is a multi-field concept (width / color / offset). Mirrors the base
  // `ring` bundle in appearance.ts, but each child is scoped to hover via
  // `index: "hover"` so writes go to `hover:ring-*` / `hover:ring-offset-*` /
  // `hover:ring-<color>` instead of base.
  {
    id: "hover.ring",
    label: "Ring",
    section: "hover",
    keywords: ["hover", "ring", "focus", "width", "color", "offset"],
    sortOrder: 14,
    input: {
      type: "bundle",
      properties: [
        {
          id: "hover.ringWidth",
          label: "Width",
          section: "hover",
          keywords: ["hover", "ring", "width"],
          input: {
            type: "universal",
            propTag: "ring",
            tailwindKey: "ringWidth",
            allowedTypes: HOVER_TYPES,
            showVarSelector: true,
          },
          propKey: "ringWidth",
          index: "hover",
          inline: true,
        },
        {
          id: "hover.ringColor",
          label: "Color",
          section: "hover",
          keywords: ["hover", "ring", "color"],
          input: { type: "color", prefix: "ring" },
          propKey: "ringColor",
          index: "hover",
          inline: true,
        },
        {
          id: "hover.ringOffsetWidth",
          label: "Offset",
          section: "hover",
          keywords: ["hover", "ring", "offset"],
          input: {
            type: "universal",
            propTag: "ring-offset",
            tailwindKey: "ringOffsetWidth",
            allowedTypes: HOVER_TYPES,
            showVarSelector: true,
          },
          propKey: "ringOffsetWidth",
          index: "hover",
          inline: true,
        },
      ],
    },
  },
];
