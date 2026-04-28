/**
 * Toolbox rendering for components registered via defineComponent() (built-ins
 * and app-supplied). This is what ComponentSettings uses for the Components tab.
 *
 * Each preset becomes its own toolbox entry. By default it lands in the host
 * `def.category`; a preset may carry `category: "..."` to land in a different
 * toolbox section (e.g. Container "Social Nav" → "Navigation").
 */
import React from "react";
import { RenderToolComponent, ToolboxItemDisplay } from "./toolboxUtils";
import type { ResolvedComponentDef } from "../../../define";
import { resolveToolboxIcon } from "./resolveToolboxIcon";

export interface CategorizedToolboxEntry {
  category: string;
  entry: React.ReactElement;
}

/**
 * Build toolbox entries for a defineComponent() definition. Returns one
 * entry per preset, each tagged with the toolbox category it should land
 * in (preset.category ?? def.category).
 */
export function buildCustomToolboxEntries(
  def: ResolvedComponentDef
): CategorizedToolboxEntry[] {
  const presets =
    def.presets.length > 0
      ? def.presets
      : [{ label: def.displayName, description: def.description, icon: def.icon, props: def.defaultProps }];

  return presets.map((preset, i) => {
    const IconComp = resolveToolboxIcon(preset.icon || def.icon);
    const children = typeof preset.children === "function" ? preset.children() : preset.children;
    const entry = (
      <RenderToolComponent
        key={`${def.name}-preset-${i}`}
        element={def.component}
        display={<ToolboxItemDisplay icon={IconComp} label={preset.label} />}
        description={preset.description || def.description}
        custom={{ displayName: preset.label, preset: preset.label }}
        {...def.defaultProps}
        {...(preset.props || {})}
      >
        {children}
      </RenderToolComponent>
    );
    return { category: preset.category ?? def.category, entry };
  });
}
