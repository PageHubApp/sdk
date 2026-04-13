/**
 * @pagehub/sdk — defineComponent()
 *
 * Unified API for registering components — used by both built-in SDK
 * components and external consumers. One definition drives the editor,
 * viewer, static renderer, and toolbox.
 *
 * Usage:
 * ```ts
 * import { defineComponent } from "@pagehub/sdk";
 * import { TbStar } from "react-icons/tb";
 *
 * const Rating = defineComponent({
 *   name: "Rating",
 *   component: RatingStars,
 *   icon: TbStar,
 *   props: {
 *     value: { type: "slider", label: "Rating", min: 0, max: 5 },
 *   },
 * });
 * ```
 */

import React, { createContext, useContext } from "react";
import type { ToHTMLFn } from "./utils/static-html";
import { staticClasses, buildAttrs, escapeHTML } from "./utils/static-html";

// ─── Public types ──────────────────────────────────────────────────────────

export interface PropSchema {
  /** Input type in the settings panel */
  type: "text" | "number" | "select" | "checkbox" | "slider" | "color" | "url" | "textarea";
  /** Human-readable label */
  label: string;
  /** Default value */
  default?: any;
  /** For select: the options list */
  options?: Array<{ label: string; value: string }>;
  /** For slider/number: min, max, step */
  min?: number;
  max?: number;
  step?: number;
  /** Help text shown below the input */
  description?: string;
  /** Group in settings panel. Default: "Content" */
  section?: string;
}

export interface ComponentPreset {
  /** Label shown in the toolbox */
  label: string;
  /** Override icon for this preset */
  icon?: string | React.ReactElement | React.ComponentType;
  /** Props applied when this preset is dropped */
  props?: Record<string, any>;
  /** Nested children for complex presets (nav menus, forms, etc.) */
  children?: React.ReactNode | (() => React.ReactNode);
}

export interface ComponentModifier {
  /** Modifier identifier. For single-class modifiers this IS the class (e.g. "btn-outline"). For composites it's a semantic name (e.g. "section-wrapper"). */
  name: string;
  /** Display label in the editor UI, e.g. "Outline" */
  label: string;
  /** Optional grouping for the UI, e.g. "Style", "Size", "Shape" */
  category?: string;
  /** When true, only one modifier in this category can be active at a time (radio behavior). */
  exclusive?: boolean;
  /** Base class that must be present for this modifier to work, e.g. "btn" for "btn-primary". Auto-added when toggling on. */
  requires?: string;
  /** Class patterns to remove when this modifier is toggled on. Supports exact matches and prefix patterns ending with * (e.g. "bg-*" removes all bg- classes). */
  removes?: string[];
  /** Multi-class composition. When set, toggling adds/removes ALL these classes instead of `name`. e.g. "flex flex-row gap-space-xs items-center w-full" */
  classes?: string;
  /** Extra utility classes applied when the modifier is toggled on (pattern presets). */
  expands?: string;
  /** Optional help text shown in the editor to explain what the modifier does. */
  description?: string;
}

export interface PageHubComponentDef<P extends Record<string, any> = Record<string, any>> {
  /** Unique component type name. Must be PascalCase. */
  name: string;

  /** Display name in the toolbox and settings. Defaults to spaced name. */
  displayName?: string;

  /** The React component that renders this element. */
  component: React.ComponentType<P>;

  /** Static HTML renderer. Auto-generated fallback if omitted. */
  toHTML?: ToHTMLFn;

  /** Icon for the toolbox. react-icons name string, element, or component. */
  icon?: string | React.ReactElement | React.ComponentType;

  /** Toolbox category. Default: "Custom" */
  category?: string;

  /** Can hold child components? Default: false */
  canvas?: boolean;

  /** Main settings panel component. */
  settings?: React.ComponentType;

  /** Advanced settings tab (second tab). */
  advancedSettings?: React.ComponentType;

  /** Auto-generate settings panel from prop schema. Ignored if `settings` is provided. */
  props?: Record<string, PropSchema>;

  /** Sections of UnifiedSettings to hide. */
  disable?: string[];

  /** Special toolbar layout mode. */
  toolbarLayout?: "hidden" | string;

  /** Hover variant type for the interactions tab. */
  hoverClickVariant?: string;

  /** CraftJS rules. */
  rules?: {
    canDrag?: boolean | ((node?: any, helpers?: any) => boolean);
    canDelete?: boolean | (() => boolean);
    canMoveIn?: (nodes: any[], into?: any) => boolean;
    canMoveOut?: boolean | (() => boolean);
  };

  /** Inline editor tools (canvas overlays). Auto-generated if omitted. */
  tools?: React.ReactNode[] | ((props: any) => React.ReactNode[]);

  /** Optional JSX rendered next to toolbar chrome (e.g. header/footer toggles on Container). */
  toolbarExtra?: React.ReactNode;

  /** Group settings component (e.g. Image uses this). */
  groupSettings?: React.ComponentType<any>;

  /** Default props for new instances. */
  defaultProps?: Record<string, any>;

  /** Extra properties merged into .craft.props (for CraftJS default prop values). */
  craftProps?: Record<string, any>;

  /** Toolbox presets — each becomes a separate drag source in the sidebar. */
  presets?: ComponentPreset[];

  /** Modifiers — composable className toggles shown in the Design tab. */
  modifiers?: ComponentModifier[];
}

// ─── Resolved descriptor (internal) ────────────────────────────────────────

/** Brand symbol so we can distinguish descriptors from raw components */
const COMPONENT_DEF_BRAND = Symbol.for("pagehub.componentDef");

export interface ResolvedComponentDef<P = any> {
  readonly [COMPONENT_DEF_BRAND]: true;
  readonly name: string;
  readonly displayName: string;
  readonly component: React.ComponentType<P>;
  readonly toHTML: ToHTMLFn;
  readonly icon: string | React.ReactElement | React.ComponentType | undefined;
  readonly category: string;
  readonly canvas: boolean;
  readonly settings: React.ComponentType | undefined;
  readonly advancedSettings: React.ComponentType | undefined;
  readonly props: Record<string, PropSchema> | undefined;
  readonly disable: string[];
  readonly toolbarLayout: string | undefined;
  readonly hoverClickVariant: string | undefined;
  readonly rules: {
    canDrag: (node?: any, helpers?: any) => boolean;
    canDelete: () => boolean;
    canMoveIn: (nodes: any[], into?: any) => boolean;
    canMoveOut?: () => boolean;
  };
  readonly tools: React.ReactNode[] | ((props: any) => React.ReactNode[]) | undefined;
  readonly toolbarExtra: React.ReactNode | undefined;
  readonly groupSettings: React.ComponentType<any> | undefined;
  readonly defaultProps: Record<string, any>;
  readonly craftProps: Record<string, any>;
  readonly presets: ComponentPreset[];
  readonly modifiers: ComponentModifier[];
}

// ─── Built-in component names (for collision detection) ────────────────────

const BUILT_IN_NAMES = new Set([
  "Accordion",
  "Audio",
  "Background",
  "Button",
  "ButtonList",
  "Container",
  "ContainerGroup",
  "Divider",
  "Dropdown",
  "Embed",
  "Footer",
  "Form",
  "FormElement",
  "Header",
  "Image",
  "ImageList",
  "Map",
  "MapPoint",
  "Modal",
  "Nav",
  "Spacer",
  "Tabs",
  "Text",
  "Video",
]);

// ─── Validation ────────────────────────────────────────────────────────────

function validate<P extends Record<string, any>>(
  def: PageHubComponentDef<P>,
  allowBuiltIn: boolean
) {
  const tag = `[PageHub] defineComponent("${def.name || "?"}")`;

  if (!def.name || typeof def.name !== "string") {
    throw new Error(`${tag}: "name" is required and must be a string`);
  }
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(def.name)) {
    const suggestion = def.name.charAt(0).toUpperCase() + def.name.slice(1);
    throw new Error(
      `${tag}: name must be PascalCase (start with uppercase, alphanumeric only). Did you mean "${suggestion}"?`
    );
  }
  if (!allowBuiltIn && BUILT_IN_NAMES.has(def.name)) {
    throw new Error(`${tag}: "${def.name}" is a built-in component. Choose a different name.`);
  }
  if (
    !def.component ||
    (typeof def.component !== "function" && typeof def.component !== "object")
  ) {
    throw new Error(`${tag}: "component" is required and must be a React component`);
  }
  if (def.toHTML && typeof def.toHTML !== "function") {
    throw new Error(`${tag}: "toHTML" must be a function`);
  }
  if (def.props) {
    for (const [key, schema] of Object.entries(def.props)) {
      if (!schema.type) throw new Error(`${tag}: props.${key} is missing "type"`);
      if (!schema.label) throw new Error(`${tag}: props.${key} is missing "label"`);
      if (schema.type === "slider" && (schema.min == null || schema.max == null)) {
        throw new Error(`${tag}: props.${key} has type "slider" but is missing "min" and/or "max"`);
      }
    }
  }
  if (def.presets) {
    for (let i = 0; i < def.presets.length; i++) {
      if (!def.presets[i].label) {
        throw new Error(`${tag}: presets[${i}] is missing "label"`);
      }
    }
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** "MyRating" → "My Rating" */
function humanize(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/** Normalize boolean rules to functions, with per-node permissions override layer. */
function normalizeRules(
  rules: PageHubComponentDef["rules"],
  canvas: boolean
): ResolvedComponentDef["rules"] {
  const r = rules || {};

  // Static rules (original component definitions)
  const staticCanDrag =
    typeof r.canDrag === "function"
      ? r.canDrag
      : typeof r.canDrag === "boolean"
        ? () => r.canDrag as boolean
        : () => true;

  const staticCanDelete =
    typeof r.canDelete === "function"
      ? r.canDelete
      : typeof r.canDelete === "boolean"
        ? () => r.canDelete as boolean
        : () => true;

  const staticCanMoveIn =
    typeof r.canMoveIn === "function" ? r.canMoveIn : canvas ? () => true : () => false;

  const staticCanMoveOut = r.canMoveOut != null
    ? typeof r.canMoveOut === "function" ? r.canMoveOut : () => r.canMoveOut as boolean
    : undefined;

  // Wrap with per-node permissions check (custom.permissions overrides static rules)
  return {
    canDrag: (node?: any, helpers?: any) => {
      const perms = node?.data?.custom?.permissions;
      if (perms?.canDrag != null) return perms.canDrag;
      return staticCanDrag(node, helpers);
    },
    canDelete: (node?: any) => {
      const perms = node?.data?.custom?.permissions;
      if (perms?.canDelete != null) return perms.canDelete;
      return staticCanDelete(node);
    },
    canMoveIn: (nodes: any[], into?: any) => {
      const perms = into?.data?.custom?.permissions;
      if (perms?.canMoveIn === false) return false;
      return staticCanMoveIn(nodes, into);
    },
    ...(staticCanMoveOut != null
      ? {
          canMoveOut: (node?: any) => {
            const perms = node?.data?.custom?.permissions;
            if (perms?.canMoveOut != null) return perms.canMoveOut;
            return staticCanMoveOut(node);
          },
        }
      : {}),
  };
}

/** Build a fallback toHTML when the consumer doesn't provide one */
function buildFallbackToHTML(canvas: boolean): ToHTMLFn {
  if (canvas) {
    return (props, childrenHTML, ctx) => {
      const cls = staticClasses(props, ctx);
      return childrenHTML
        ? `<div${buildAttrs({ class: cls || undefined })}>${childrenHTML}</div>`
        : `<div${buildAttrs({ class: cls || undefined })}></div>`;
    };
  }
  return (props, _children, ctx) => {
    const cls = staticClasses(props, ctx);
    const text = props.text || props.label || props.title || props.content || "";
    const escaped = typeof text === "string" ? escapeHTML(text) : "";
    return `<div${buildAttrs({ class: cls || undefined })}>${escaped}</div>`;
  };
}

// ─── defineComponent() ─────────────────────────────────────────────────────

/**
 * Define a component for the PageHub editor.
 *
 * Returns a frozen descriptor that can be passed to `PageHub.init()`,
 * `<PageHubEditor>`, `<PageHubViewer>`, or `renderToHTML()` via the
 * `components` array.
 *
 * For built-in SDK components, pass `{ __internal: true }` as the second
 * argument to skip the built-in name collision check.
 */
export function defineComponent<P extends Record<string, any> = Record<string, any>>(
  def: PageHubComponentDef<P>,
  opts?: { __internal?: boolean }
): ResolvedComponentDef<P> {
  validate(def, !!opts?.__internal);

  const canvas = def.canvas ?? false;

  const resolved: ResolvedComponentDef<P> = {
    [COMPONENT_DEF_BRAND]: true,
    name: def.name,
    displayName: def.displayName || humanize(def.name),
    component: def.component,
    toHTML: def.toHTML || buildFallbackToHTML(canvas),
    icon: def.icon,
    category: def.category || "Custom",
    canvas,
    settings: def.settings,
    advancedSettings: def.advancedSettings,
    props: def.props,
    disable: def.disable || [],
    toolbarLayout: def.toolbarLayout,
    hoverClickVariant: def.hoverClickVariant,
    rules: normalizeRules(def.rules, canvas),
    tools: def.tools,
    toolbarExtra: def.toolbarExtra,
    groupSettings: def.groupSettings,
    defaultProps: def.defaultProps || {},
    craftProps: def.craftProps || {},
    presets: def.presets || [],
    modifiers: def.modifiers || [],
  };

  return Object.freeze(resolved);
}

// ─── Editor-side processing ────────────────────────────────────────────────
//
// These functions are only called inside editor.tsx. The viewer and static
// renderer never import them, so editor chrome stays out of those bundles.

/**
 * Build an auto-generated settings panel from a props schema.
 * Returns a React component that renders ToolbarItem for each prop.
 */
function buildAutoSettings(propsSchema: Record<string, PropSchema>): React.ComponentType {
  // Group by section
  const sections = new Map<string, Array<[string, PropSchema]>>();
  for (const [key, schema] of Object.entries(propsSchema)) {
    const section = schema.section || "Content";
    if (!sections.has(section)) sections.set(section, []);
    sections.get(section)!.push([key, schema]);
  }

  // Dynamic import to avoid pulling ToolbarItem into viewer/static bundles.
  // This function is only called inside attachCraft → processForEditor → editor.tsx.
  let ToolbarItem: React.ComponentType<any> | null = null;
  let ToolbarSection: React.ComponentType<any> | null = null;

  const loadDeps = () => {
    if (!ToolbarItem) {
      // These are editor-only imports, resolved at render time
      ToolbarItem = require("./chrome/Toolbar/ToolbarItem").ToolbarItem;
      ToolbarSection = require("./chrome/Toolbar/ToolbarSection").ToolbarSection;
    }
  };

  // Map schema type → ToolbarItem type
  const typeMap: Record<string, string> = {
    text: "text",
    number: "number",
    select: "select",
    checkbox: "checkbox",
    slider: "slider",
    color: "color",
    url: "text",
    textarea: "textarea",
  };

  return function AutoSettings() {
    loadDeps();
    const TI = ToolbarItem!;
    const TS = ToolbarSection!;

    return React.createElement(
      React.Fragment,
      null,
      ...Array.from(sections.entries()).map(([sectionName, entries]) =>
        React.createElement(
          TS,
          { key: sectionName, title: sectionName, full: 1 },
          ...entries.map(([propKey, schema]) =>
            React.createElement(TI, {
              key: propKey,
              propKey,
              propType: "component",
              type: typeMap[schema.type] || "text",
              label: schema.label,
              description: schema.description,
              ...(schema.options ? { options: schema.options } : {}),
              ...(schema.min != null ? { min: schema.min } : {}),
              ...(schema.max != null ? { max: schema.max } : {}),
              ...(schema.step != null ? { step: schema.step } : {}),
            })
          )
        )
      )
    );
  };
}

/**
 * Selected name chip + hover name chip when a canvas component has no tools
 * or explicitly passes an empty list (layout nodes migrated off inline chrome).
 */
function getMinimalCanvasTools(): (props: any) => React.ReactNode[] {
  const { NameNodeController } = require("./chrome/NodeControllers/NameNodeController");
  const { HoverNodeController } = require("./chrome/NodeControllers/HoverNodeController");
  return () => [
    React.createElement(NameNodeController, {
      key: "ph-name",
      position: "top",
      align: "end",
      placement: "start",
    }),
    React.createElement(HoverNodeController, {
      key: "ph-hover",
      position: "top",
      align: "end",
      placement: "start",
    }),
  ];
}

/**
 * Attach .craft config to a component based on its definition.
 * This is the editor-only step that wires up toolbar, tools, rules, etc.
 */
function attachCraft(
  def: ResolvedComponentDef,
  LazyUnifiedSettings: React.ComponentType,
  defaultTools?: (canvas: boolean) => React.ReactNode[] | ((props: any) => React.ReactNode[])
) {
  const component = def.component as any;

  const craft: any = {
    displayName: def.displayName,
    toolbar: {
      icon: def.icon ?? null,
      settings: def.settings || (def.props ? buildAutoSettings(def.props) : undefined),
      hide: def.disable,
    },
    rules: {
      canDrag: def.rules.canDrag,
      canDelete: def.rules.canDelete,
      canMoveIn: def.rules.canMoveIn,
      ...(def.rules.canMoveOut ? { canMoveOut: def.rules.canMoveOut } : {}),
    },
    related: {
      toolbar: LazyUnifiedSettings,
    },
    props: { ...def.craftProps },
  };

  // Advanced settings tab
  if (def.advancedSettings) {
    craft.toolbar.advancedSettings = def.advancedSettings;
  }

  // Toolbar layout
  if (def.toolbarLayout) {
    craft.toolbar.layout = def.toolbarLayout;
  }

  // Hover variant
  if (def.hoverClickVariant) {
    craft.toolbar.hover = def.hoverClickVariant;
  }

  // Group settings
  if (def.groupSettings) {
    craft.related.groupSettings = def.groupSettings;
  }

  // Inline tools (canvas nodes: empty tools → name + hover labels; omitted → same)
  if (def.canvas) {
    const minimal = getMinimalCanvasTools();
    if (def.tools) {
      if (typeof def.tools === "function") {
        craft.props.tools = (props: any) => {
          const out = (def.tools as (p: any) => React.ReactNode[])(props);
          if (Array.isArray(out) && out.length === 0) return minimal(props);
          return out;
        };
      } else if (Array.isArray(def.tools) && def.tools.length === 0) {
        craft.props.tools = minimal;
      } else {
        craft.props.tools = def.tools;
      }
    } else if (defaultTools) {
      craft.props.tools = defaultTools(def.canvas);
    } else {
      craft.props.tools = minimal;
    }
  } else if (def.tools) {
    craft.props.tools = def.tools;
  } else if (defaultTools) {
    craft.props.tools = defaultTools(def.canvas);
  }

  // Modifiers
  if (def.modifiers.length > 0) {
    craft.toolbar.modifiers = def.modifiers;
  }

  if (def.toolbarExtra) {
    craft.toolbar.toolbarExtra = def.toolbarExtra;
  }

  component.craft = craft;
}

/**
 * Process an array of component definitions for the editor.
 * Returns a resolver map and toolbox category data.
 */
export function processForEditor(
  defs: ResolvedComponentDef[],
  LazyUnifiedSettings: React.ComponentType,
  defaultTools?: (canvas: boolean) => React.ReactNode[] | ((props: any) => React.ReactNode[])
): {
  resolver: Record<string, React.ComponentType>;
  toolboxCategories: Array<{ title: string; content: ResolvedComponentDef[] }>;
} {
  const resolver: Record<string, React.ComponentType> = {};
  const categoryMap = new Map<string, ResolvedComponentDef[]>();

  // Check for duplicate names
  const seen = new Set<string>();
  for (const def of defs) {
    if (seen.has(def.name)) {
      throw new Error(
        `[PageHub] Duplicate component name: "${def.name}". Each component must have a unique name.`
      );
    }
    seen.add(def.name);

    // Attach .craft config
    attachCraft(def, LazyUnifiedSettings, defaultTools);

    // Add to resolver
    resolver[def.name] = def.component;

    // Group by category for toolbox
    if (!categoryMap.has(def.category)) {
      categoryMap.set(def.category, []);
    }
    categoryMap.get(def.category)!.push(def);
  }

  const toolboxCategories = Array.from(categoryMap.entries()).map(([title, content]) => ({
    title,
    content,
  }));

  return { resolver, toolboxCategories };
}

/**
 * Process an array of component definitions for the viewer.
 * Returns a plain resolver map (no .craft, no editor chrome).
 */
export function processForViewer(
  defs: ResolvedComponentDef[]
): Record<string, React.ComponentType> {
  const resolver: Record<string, React.ComponentType> = {};
  for (const def of defs) {
    resolver[def.name] = def.component;
  }
  return resolver;
}

/**
 * Process an array of component definitions for the static renderer.
 * Returns a map of name → toHTML function.
 */
export function processForStatic(defs: ResolvedComponentDef[]): Record<string, ToHTMLFn> {
  const resolver: Record<string, ToHTMLFn> = {};
  for (const def of defs) {
    resolver[def.name] = def.toHTML;
  }
  return resolver;
}

// ─── Context for passing custom toolbox data to ComponentSettings ──────────

export const CustomComponentsContext = createContext<{
  toolboxCategories: Array<{ title: string; content: ResolvedComponentDef[] }>;
}>({ toolboxCategories: [] });

export const useCustomComponents = () => useContext(CustomComponentsContext);
