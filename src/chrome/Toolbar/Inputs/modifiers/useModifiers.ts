import { ROOT_NODE, useEditor, useNode } from "@craftjs/core";
import { useMemo } from "react";
import type { ComponentModifier } from "../../../../define";

export interface ResolvedModifier extends ComponentModifier {
  origin: "builtin" | "site";
}

export function useModifiers() {
  const { query, actions } = useEditor();
  const {
    id,
    actions: { setProp },
    componentName,
    activeModifiers,
    currentClassName,
    toolbarModifiers,
  } = useNode((node) => ({
    componentName: node.data.displayName || node.data.name || "",
    activeModifiers: (node.data.props?.root?.activeModifiers as string[]) || [],
    currentClassName: (node.data.props?.className as string) || "",
    toolbarModifiers: (node.data.type as any)?.craft?.toolbar?.modifiers as
      | ComponentModifier[]
      | undefined,
  }));

  // Read site-level modifiers from ROOT node
  const siteModifiers = useMemo(() => {
    try {
      const rootNode = query.node(ROOT_NODE).get();
      const allSite = rootNode?.data?.props?.modifiers;
      if (!allSite || typeof allSite !== "object") return [];
      const typeName =
        query.node(id).get()?.data?.name ||
        query.node(id).get()?.data?.displayName ||
        "";
      return (allSite[typeName] || []) as ComponentModifier[];
    } catch {
      return [];
    }
  }, [query, id]);

  // Merge all sources
  const allModifiers: ResolvedModifier[] = useMemo(() => {
    const result: ResolvedModifier[] = [];
    if (toolbarModifiers) {
      for (const m of toolbarModifiers) {
        result.push({ ...m, origin: "builtin" });
      }
    }
    for (const m of siteModifiers) {
      result.push({ ...m, origin: "site" });
    }
    return result;
  }, [toolbarModifiers, siteModifiers]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, ResolvedModifier[]>();
    for (const mod of allModifiers) {
      const cat = mod.category || "General";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(mod);
    }
    return map;
  }, [allModifiers]);

  const isActive = (name: string) => activeModifiers.includes(name);

  const toggleModifier = (mod: ResolvedModifier) => {
    const active = isActive(mod.name);

    setProp((props: any) => {
      if (!props.root) props.root = {};
      const classes = (props.className || "").split(/\s+/).filter(Boolean);

      if (active) {
        // Remove the modifier class name
        props.className = classes.filter((c: string) => c !== mod.name).join(" ");
        props.root.activeModifiers = (
          props.root.activeModifiers || []
        ).filter((n: string) => n !== mod.name);
      } else {
        // Add the modifier class name
        if (!classes.includes(mod.name)) {
          classes.push(mod.name);
        }
        props.className = classes.join(" ");
        props.root.activeModifiers = [
          ...(props.root.activeModifiers || []),
          mod.name,
        ];
      }
    });
  };

  // The resolved component type name for the selected node
  const nodeTypeName =
    query.node(id).get()?.data?.name ||
    query.node(id).get()?.data?.displayName ||
    "";

  const saveAsModifier = (label: string, targetType?: string) => {
    const typeName = targetType || nodeTypeName;
    if (!typeName || !label.trim()) return;

    const name = label.trim().toLowerCase().replace(/\s+/g, "-");

    actions.setProp(ROOT_NODE, (props: any) => {
      if (!props.modifiers) props.modifiers = {};
      if (!props.modifiers[typeName]) props.modifiers[typeName] = [];
      if (props.modifiers[typeName].some((m: any) => m.name === name)) return;
      props.modifiers[typeName].push({ name, label: label.trim() });
    });
  };

  return {
    allModifiers,
    grouped,
    isActive,
    toggleModifier,
    saveAsModifier,
    componentName,
    nodeTypeName,
    hasModifiers: allModifiers.length > 0,
  };
}
