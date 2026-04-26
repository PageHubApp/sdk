/**
 * Misc property defs that don't fit into typography/layout/etc — pure data.
 *
 * Spans alignment, spacing, properties, ai-context, import-export, permissions,
 * conditions, animations, scroll-effect, overflow-scroll, data-source.
 *
 * TODO: split this further (e.g. alignment.ts, spacing.ts, properties.ts) once
 * the AlignmentBody / PaddingBody / MarginBody slots are decomposed into
 * individual property defs.
 */
import React from "react";
import {
  TbBorderInner,
  TbBoxPadding,
  TbBoxMargin,
  TbSquare,
} from "react-icons/tb";
import type { PropertyDef } from "../propertyDefs";

const SPACING_TYPES = ["tailwind", "calc", "px", "em", "rem", "%"] as const;

export const advancedProperties: PropertyDef[] = [
  {
    id: "padding",
    label: "Padding",
    section: "alignment",
    keywords: ["padding", "p", "px", "py", "pt", "pb", "inner"],
    input: {
      type: "shorthand",
      varSelectorPrefix: "p",
      allowedTypes: [...SPACING_TYPES],
      modes: [
        {
          id: "uniform",
          icon: React.createElement(TbSquare, { className: "size-3.5" }),
          ariaLabel: "Uniform padding",
          tags: ["p"],
          labels: [""],
        },
        {
          id: "axes",
          icon: React.createElement(TbBoxPadding, { className: "size-3.5" }),
          ariaLabel: "Padding X & Y",
          tags: ["px", "py"],
          labels: ["X", "Y"],
        },
        {
          id: "sides",
          icon: React.createElement(TbBorderInner, { className: "size-3.5" }),
          ariaLabel: "Padding per-side",
          tags: ["pt", "pr", "pb", "pl"],
          labels: ["T", "R", "B", "L"],
          columns: 2,
        },
      ],
    },
    pinned: true,
    sortOrder: 80,
  },
  {
    id: "margin",
    label: "Margin",
    section: "alignment",
    keywords: ["margin", "m", "mx", "my", "mt", "mb", "outer"],
    input: {
      type: "shorthand",
      varSelectorPrefix: "m",
      allowedTypes: [...SPACING_TYPES],
      modes: [
        {
          id: "uniform",
          icon: React.createElement(TbSquare, { className: "size-3.5" }),
          ariaLabel: "Uniform margin",
          tags: ["m"],
          labels: [""],
        },
        {
          id: "axes",
          icon: React.createElement(TbBoxMargin, { className: "size-3.5" }),
          ariaLabel: "Margin X & Y",
          tags: ["mx", "my"],
          labels: ["X", "Y"],
        },
        {
          id: "sides",
          icon: React.createElement(TbBorderInner, { className: "size-3.5" }),
          ariaLabel: "Margin per-side",
          tags: ["mt", "mr", "mb", "ml"],
          labels: ["T", "R", "B", "L"],
          columns: 2,
        },
      ],
    },
    pinned: true,
    sortOrder: 85,
  },
  {
    id: "properties.elementId",
    label: "Element ID",
    section: "properties",
    keywords: ["id", "element", "html", "anchor", "link", "hash"],
    input: { type: "custom", component: "PropertiesInput" },
    sortOrder: 0,
  },
  {
    id: "aiContext",
    label: "AI Context",
    section: "ai-context",
    keywords: ["ai", "context", "notes", "tags", "description", "assistant", "prompt"],
    input: { type: "custom", component: "NodeAiContextSection" },
    sortOrder: 0,
  },
  {
    id: "importExport",
    label: "Import / Export",
    section: "import-export",
    keywords: ["json", "copy", "paste", "import", "export", "code", "clipboard"],
    input: { type: "custom", component: "ComponentImportExport" },
    hideKey: "importExport",
    sortOrder: 0,
  },
  {
    id: "permissions",
    label: "Permissions",
    section: "permissions",
    keywords: ["permission", "lock", "drag", "delete", "drop", "move", "protect", "restrict"],
    input: { type: "custom", component: "PermissionsSection" },
    sortOrder: 0,
  },
  {
    id: "conditions",
    label: "Conditions",
    section: "conditions",
    keywords: [
      "condition",
      "visibility",
      "show",
      "hide",
      "url",
      "form",
      "device",
      "auth",
      "connector",
    ],
    input: { type: "custom", component: "ConditionsInput" },
    sortOrder: 0,
  },
  {
    id: "animations",
    label: "Animation",
    section: "animations",
    keywords: [
      "animate",
      "motion",
      "entrance",
      "scroll",
      "framer",
      "css",
      "fade",
      "slide",
      "scale",
      "bounce",
      "spring",
    ],
    input: { type: "custom", component: "AnimationsInput" },
    hideKey: "animations",
    sortOrder: 0,
  },
  {
    id: "scrollEffect",
    label: "Scroll Effect",
    section: "scroll-effect",
    keywords: ["scroll", "horizontal", "timeline", "pin", "gsap", "section", "parallax"],
    input: { type: "custom", component: "ContainerScrollEffectSection" },
    showWhen: (_cls, props) => props._craftName === "Container",
    sortOrder: 0,
  },
  {
    id: "containerOverflow",
    label: "Overflow",
    section: "overflow-scroll",
    keywords: ["overflow", "scroll", "drag", "scrollbar", "horizontal", "carousel"],
    input: { type: "custom", component: "ContainerOverflowSection" },
    showWhen: (_cls, props) => props._craftName === "Container",
    sortOrder: 0,
  },
  {
    id: "dataSource",
    label: "Data source",
    section: "data-source",
    keywords: [
      "data",
      "source",
      "stripe",
      "connector",
      "products",
      "category",
      "search",
      "query",
      "repeater",
    ],
    input: { type: "custom", component: "DataSourceSectionSlot" },
    showWhen: (_cls, props) => !!props.dataSource,
    sortOrder: 0,
  },
];
