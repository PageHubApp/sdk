import type { ComponentType, ReactElement } from "react";
import type { ResolvedComponentDef } from "../../define";
import { NAV_EXTRA_PRESETS } from "../../components/definitions";
import { SavedComponentLoader } from "./toolbox/savedComponents";

export type ToolboxInsertDescriptor = {
  key: string;
  category: string;
  label: string;
  /** Craft / preset icon (same shape as `defineComponent`); undefined falls back to puzzle in UI. */
  icon?: string | ReactElement | ComponentType<{ className?: string }> | undefined;
  toolProps: { element: any; className?: string; root?: any; [key: string]: any };
};

function presetChildren(preset: { children?: unknown }): unknown {
  const ch = preset.children;
  if (typeof ch === "function") return (ch as () => unknown)();
  return ch;
}

/**
 * Flat list of insertable toolbox presets (same sources as ComponentSettings sidebar).
 */
export function buildToolboxInsertDescriptors(
  toolboxCategories: Array<{ title: string; content: ResolvedComponentDef[] }> | undefined,
  components:
    | Array<{
        name?: string;
        rootNodeId?: string;
        isSection?: boolean;
        nodes?: string;
        [k: string]: any;
      }>
    | null
    | undefined
): ToolboxInsertDescriptor[] {
  const rows: ToolboxInsertDescriptor[] = [];

  for (const cat of toolboxCategories || []) {
    for (const def of cat.content || []) {
      const presets =
        def.presets.length > 0
          ? def.presets
          : [{ label: def.displayName, icon: def.icon, props: def.defaultProps } as any];

      presets.forEach((preset: any, i: number) => {
        const children = presetChildren(preset);
        rows.push({
          key: `${def.name}-preset-${i}`,
          category: cat.title,
          label: String(preset.label || def.displayName),
          icon: (preset.icon ?? def.icon) as ToolboxInsertDescriptor["icon"],
          toolProps: {
            element: def.component,
            custom: { displayName: preset.label || def.displayName },
            ...def.defaultProps,
            ...(preset.props || {}),
            ...(children !== undefined && children !== null ? { children } : {}),
          },
        });
      });
    }
  }

  NAV_EXTRA_PRESETS.forEach((preset: any, i: number) => {
    const children = typeof preset.children === "function" ? preset.children() : preset.children;
    rows.push({
      key: `nav-extra-${i}`,
      category: "Navigation",
      label: String(preset.label || `Preset ${i}`),
      icon: preset.icon as ToolboxInsertDescriptor["icon"],
      toolProps: {
        element: preset.element,
        ...(preset.props || {}),
        custom: { displayName: preset.label },
        ...(children !== undefined && children !== null ? { children } : {}),
      },
    });
  });

  for (const c of components?.filter(component => !component.isSection) || []) {
    const name = c.name || "Component";
    rows.push({
      key: `saved-${c.rootNodeId || name}-${rows.length}`,
      category: "My Components",
      label: name,
      toolProps: {
        element: SavedComponentLoader,
        componentData: c,
        custom: { displayName: name },
      },
    });
  }

  return rows;
}
