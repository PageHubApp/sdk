import React from "react";

import { ComponentDefinitionError } from "../../utils/errors";
import type {
  PropSchema,
  ResolvedComponentDef,
} from "../types";

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
      ToolbarItem = require("../../chrome/toolbar/ToolbarItem").ToolbarItem;
      ToolbarSection = require("../../chrome/toolbar/ToolbarSection").ToolbarSection;
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
 * Attach .craft config to a component based on its definition.
 * This is the editor-only step that wires up toolbar, tools, rules, etc.
 */
function attachCraft(
  def: ResolvedComponentDef,
  inspectorToolbar: React.ComponentType,
  defaultTools?: (canvas: boolean) => React.ReactNode[] | ((props: any) => React.ReactNode[])
) {
  const component = def.component as any;

  const craft: any = {
    name: def.name,
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
      toolbar: inspectorToolbar,
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

  // Inline tools — always normalize to `(props) => ReactNode[]` so callers never branch.
  if (typeof def.tools === "function") {
    craft.props.tools = def.tools;
  } else if (Array.isArray(def.tools)) {
    const arr = def.tools;
    craft.props.tools = () => arr;
  } else if (defaultTools) {
    craft.props.tools = defaultTools(def.canvas);
  } else {
    craft.props.tools = () => [];
  }

  if (def.toolbarExtra) {
    craft.toolbar.toolbarExtra = def.toolbarExtra;
  }

  component.craft = craft;

  // Mirror craft.displayName onto the React component's own displayName so
  // CraftJS internals + React DevTools identify the component correctly. In
  // minified UMD builds, Function.name gets mangled (e.g. "tne") — without
  // this assignment the resolver-by-reference lookup in @craftjs/core's
  // toNodeTree fails with a bare "Invariant failed" on every toolbox drag.
  if (!component.displayName) {
    component.displayName = def.displayName;
  }
}

/**
 * Process an array of component definitions for the editor.
 * Returns a resolver map and toolbox category data.
 */
export function processForEditor(
  defs: ResolvedComponentDef[],
  inspectorToolbar: React.ComponentType,
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
      throw new ComponentDefinitionError({
        code: "COMPONENT_NAME_DUPLICATE",
        message: `[PageHub] Duplicate component name: "${def.name}". Each component must have a unique name.`,
        hint: "Two defineComponent calls used the same name. Rename one or de-duplicate the registration.",
      });
    }
    seen.add(def.name);

    // Attach .craft config
    attachCraft(def, inspectorToolbar, defaultTools);

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
