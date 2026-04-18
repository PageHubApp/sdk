/**
 * Toolbox rendering for components registered via defineComponent() (built-ins
 * and app-supplied). This is what ComponentSettings uses for the Components tab.
 *
 * Legacy per-category Toolbox/*.tsx drag sources were removed; presets and
 * defaultProps live on each `*Def` in packages/sdk/src/components/*.craft.*.
 */
import React from "react";
import { RenderToolComponent, ToolboxItemDisplay } from "./toolboxUtils";
import type { ResolvedComponentDef } from "../../../define";
import { resolveToolboxIcon } from "./resolveToolboxIcon";

/**
 * Build toolbox entries for raw extra presets (like Nav's ButtonList-based presets).
 * These specify their own `element` and don't go through defineComponent().
 */
export function buildExtraPresetEntries(
  presets: Array<{
    label: string;
    description?: string;
    icon?: any;
    element: any;
    props?: Record<string, any>;
    children?: any;
  }>
): React.ReactElement[] {
  return presets.map((preset, i) => {
    const IconComp = resolveToolboxIcon(preset.icon);
    const children = typeof preset.children === "function" ? preset.children() : preset.children;
    return (
      <RenderToolComponent
        key={`extra-preset-${i}`}
        element={preset.element}
        display={<ToolboxItemDisplay icon={IconComp} label={preset.label} />}
        description={preset.description}
        custom={{ displayName: preset.label }}
        {...(preset.props || {})}
      >
        {children}
      </RenderToolComponent>
    );
  });
}

/**
 * Build toolbox entries for a defineComponent() definition.
 * Returns an array of React elements (one per preset, or one default).
 */
export function buildCustomToolboxEntries(def: ResolvedComponentDef): React.ReactElement[] {
  const presets =
    def.presets.length > 0
      ? def.presets
      : [{ label: def.displayName, description: def.description, icon: def.icon, props: def.defaultProps }];

  return presets.map((preset, i) => {
    const IconComp = resolveToolboxIcon(preset.icon || def.icon);
    // Resolve children — can be ReactNode or a factory function
    const children = typeof preset.children === "function" ? preset.children() : preset.children;
    return (
      <RenderToolComponent
        key={`${def.name}-preset-${i}`}
        element={def.component}
        display={<ToolboxItemDisplay icon={IconComp} label={preset.label} />}
        description={preset.description || def.description}
        custom={{ displayName: preset.label }}
        {...def.defaultProps}
        {...(preset.props || {})}
      >
        {children}
      </RenderToolComponent>
    );
  });
}
