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
    pinned: false,
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
    pinned: false,
    sortOrder: 85,
  },
  {
    id: "scrollPadding",
    label: "Scroll Padding",
    section: "alignment",
    keywords: ["scroll", "padding", "snap", "p", "px", "py", "pt", "pb"],
    input: {
      type: "shorthand",
      varSelectorPrefix: "scroll-p",
      allowedTypes: [...SPACING_TYPES],
      modes: [
        {
          id: "uniform",
          icon: React.createElement(TbSquare, { className: "size-3.5" }),
          ariaLabel: "Uniform scroll padding",
          tags: ["scroll-p"],
          labels: [""],
          tailwindKeys: ["scrollP"],
        },
        {
          id: "axes",
          icon: React.createElement(TbBoxPadding, { className: "size-3.5" }),
          ariaLabel: "Scroll padding X & Y",
          tags: ["scroll-px", "scroll-py"],
          labels: ["X", "Y"],
          tailwindKeys: ["scrollPx", "scrollPy"],
        },
        {
          id: "sides",
          icon: React.createElement(TbBorderInner, { className: "size-3.5" }),
          ariaLabel: "Scroll padding per-side",
          tags: ["scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"],
          labels: ["T", "R", "B", "L"],
          tailwindKeys: ["scrollPt", "scrollPr", "scrollPb", "scrollPl"],
          columns: 2,
        },
      ],
    },
    sortOrder: 90,
  },
  {
    id: "scrollMargin",
    label: "Scroll Margin",
    section: "alignment",
    keywords: ["scroll", "margin", "snap", "m", "mx", "my", "mt", "mb"],
    input: {
      type: "shorthand",
      varSelectorPrefix: "scroll-m",
      allowedTypes: [...SPACING_TYPES],
      modes: [
        {
          id: "uniform",
          icon: React.createElement(TbSquare, { className: "size-3.5" }),
          ariaLabel: "Uniform scroll margin",
          tags: ["scroll-m"],
          labels: [""],
          tailwindKeys: ["scrollM"],
        },
        {
          id: "axes",
          icon: React.createElement(TbBoxMargin, { className: "size-3.5" }),
          ariaLabel: "Scroll margin X & Y",
          tags: ["scroll-mx", "scroll-my"],
          labels: ["X", "Y"],
          tailwindKeys: ["scrollMx", "scrollMy"],
        },
        {
          id: "sides",
          icon: React.createElement(TbBorderInner, { className: "size-3.5" }),
          ariaLabel: "Scroll margin per-side",
          tags: ["scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"],
          labels: ["T", "R", "B", "L"],
          tailwindKeys: ["scrollMt", "scrollMr", "scrollMb", "scrollMl"],
          columns: 2,
        },
      ],
    },
    sortOrder: 95,
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
    // Body chip-list. Pinned so AccordionAddMenu's `sectionPopoverProp` path
    // (which requires the picker to be the only NON-pinned prop) can mount
    // the header `+`. `isActive` gates body visibility on the array contents
    // — empty array hides the row and the section collapses back to the
    // clean header-only "click + to add" state.
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
    pinned: true,
    isActive: (_cls, props) => {
      if (Array.isArray(props?.conditions) && props.conditions.length > 0) return true;
      const groups = props?.conditionGroups;
      if (Array.isArray(groups)) {
        for (const g of groups) {
          if (Array.isArray(g?.conditions) && g.conditions.length > 0) return true;
        }
      }
      return false;
    },
    sortOrder: 0,
  },
  {
    // Section-header `+` picker. Popover-mode + non-pinned, so AccordionAddMenu's
    // `sectionPopoverProp` path mounts it inside the section title row.
    id: "conditions:add",
    label: "Add condition",
    section: "conditions",
    help: "Add a visibility condition.",
    keywords: ["add", "condition", "url", "form", "auth", "device", "connector"],
    input: { type: "custom", component: "ConditionsAddPicker" },
    sortOrder: 1,
  },
  {
    id: "stateBindings",
    label: "State bindings",
    section: "stateBindings",
    keywords: ["state", "active", "open", "modifier", "binding"],
    input: { type: "custom", component: "StateBindingsInput" },
    pinned: true,
    isActive: (_cls, props) =>
      Array.isArray(props?.stateModifiers) && props.stateModifiers.length > 0,
    sortOrder: 0,
  },
  {
    id: "stateBindings:add",
    label: "Add state binding",
    section: "stateBindings",
    help: "Add a binding that applies modifiers when state matches.",
    keywords: ["add", "state", "binding", "active", "modifier"],
    input: { type: "custom", component: "StateBindingsAddPicker" },
    sortOrder: 1,
  },
  // Container-only registry-wiring: visibilityStateKey + computedStateBindings.
  // Pinned body content rendered below the StateBindings chip-list.
  {
    id: "containerStateWiring",
    label: "State wiring",
    section: "stateBindings",
    keywords: ["visibility", "state", "key", "computed", "binding", "registry"],
    input: { type: "custom", component: "ContainerStateBody" },
    pinned: true,
    showWhen: (_cls, props) => props._craftName === "Container",
    // Without `isActive` the row renders even when ContainerStateBody returns
    // null, leaving an empty padded body inside the State accordion (matches
    // the pattern used by `modifiers` / `stateBindings` to keep empty sections
    // collapsed).
    isActive: (_cls, props) =>
      typeof props?.visibilityStateKey === "string" ||
      (Array.isArray(props?.computedStateBindings) && props.computedStateBindings.length > 0),
    sortOrder: 2,
  },
  // Animation + Scroll Effect are now rows inside the unified Effects
  // builder (see registry/properties/effects.ts + effects-builder/).
  {
    id: "containerOverflow",
    label: "Scroll Behavior",
    section: "alignment",
    keywords: ["overflow", "scroll", "drag", "scrollbar", "horizontal", "carousel", "snap"],
    input: { type: "custom", component: "ContainerOverflowSection" },
    showWhen: (_cls, props) => props._craftName === "Container",
    sortOrder: 900,
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
