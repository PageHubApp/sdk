import { ROOT_NODE, useEditor, useNode } from "@craftjs/core";
import { useMemo } from "react";
import type { ComponentModifier } from "../../../../define";

export interface ResolvedModifier extends ComponentModifier {
  origin: "builtin" | "site";
}

export type ModifierRenderType = "patterns" | "dropdown" | "pills" | "chips";

export interface CategoryMeta {
  name: string;
  mods: ResolvedModifier[];
  isExclusive: boolean;
  isPattern: boolean;
  renderAs: ModifierRenderType;
  defaultOpen: boolean;
  sortOrder: number;
}

// Priority order for categories. Lower = higher priority = rendered first.
const CATEGORY_PRIORITY: Record<string, number> = {
  Pattern: 0,
  Size: 1,
  Color: 2,
  Surface: 2,
  Weight: 3,
  Align: 4,
  Font: 5,
  Style: 6,
  DaisyUI: 7,
  "DaisyUI Color": 7,
  "DaisyUI Style": 7,
  "DaisyUI Size": 7,
  Shape: 8,
  State: 9,
  Spacing: 10,
  Width: 10,
  Height: 10,
  Layout: 10,
  Padding: 10,
  General: 11,
  Custom: 12,
};

// Categories that default to open
const DEFAULT_OPEN = new Set(["Pattern", "Size", "Color", "Surface", "DaisyUI Color"]);

function deriveRenderType(name: string, mods: ResolvedModifier[]): ModifierRenderType {
  if (name === "Pattern") return "patterns";
  const allExclusive = mods.length > 0 && mods.every(m => m.exclusive);
  if (allExclusive && mods.length >= 5) return "dropdown";
  if (allExclusive && mods.length >= 2) return "pills";
  return "chips";
}

/** Resolve a modifier to its actual CSS class list. Composites use `classes`, singles use `name`. */
function resolveClasses(mod: ComponentModifier): string[] {
  return mod.classes ? mod.classes.split(/\s+/).filter(Boolean) : [mod.name];
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
  } = useNode(node => ({
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
        query.node(id).get()?.data?.name || query.node(id).get()?.data?.displayName || "";
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

  // Derive category metadata for smart rendering
  const categorized: CategoryMeta[] = useMemo(() => {
    const result: CategoryMeta[] = [];
    for (const [name, mods] of grouped) {
      const isExclusive = mods.length > 0 && mods.every(m => m.exclusive);
      const isPattern = name === "Pattern";
      const renderAs = deriveRenderType(name, mods);
      const sortOrder = CATEGORY_PRIORITY[name] ?? 11;
      const defaultOpen = DEFAULT_OPEN.has(name) || isPattern;
      result.push({ name, mods, isExclusive, isPattern, renderAs, defaultOpen, sortOrder });
    }
    result.sort((a, b) => a.sortOrder - b.sortOrder);
    return result;
  }, [grouped]);

  const isActive = (mod: ResolvedModifier) => {
    // Check tracked state first
    if (activeModifiers.includes(mod.name)) return true;
    // For composite modifiers, also check if all classes are present in className
    if (mod.classes) {
      const needed = resolveClasses(mod);
      const current = currentClassName.split(/\s+/);
      return needed.every(c => current.includes(c));
    }
    // For single-class modifiers, check className directly
    return currentClassName.split(/\s+/).includes(mod.name);
  };

  const toggleModifier = (mod: ResolvedModifier) => {
    const active = isActive(mod);

    setProp((props: any) => {
      if (!props.root) props.root = {};
      let classes = (props.className || "").split(/\s+/).filter(Boolean);
      let activeMods = [...(props.root.activeModifiers || [])];

      // If exclusive, remove other modifiers in the same category first
      if (mod.exclusive && mod.category && !active) {
        const siblings = allModifiers.filter(
          m => m.category === mod.category && m.name !== mod.name
        );
        for (const sib of siblings) {
          const sibClasses = resolveClasses(sib);
          classes = classes.filter((c: string) => !sibClasses.includes(c));
          activeMods = activeMods.filter((n: string) => n !== sib.name);
        }
      }

      const modClasses = resolveClasses(mod);

      if (active) {
        // Remove all classes for this modifier
        classes = classes.filter((c: string) => !modClasses.includes(c));
        activeMods = activeMods.filter((n: string) => n !== mod.name);
      } else {
        // Remove conflicting classes first
        if (mod.removes?.length) {
          classes = classes.filter((c: string) => {
            for (const pattern of mod.removes!) {
              if (pattern.endsWith("*")) {
                if (c.startsWith(pattern.slice(0, -1))) return false;
              } else if (c === pattern) return false;
            }
            return true;
          });
        }
        // Auto-add required base class if not present (e.g. "btn" for "btn-primary")
        if (mod.requires) {
          for (const req of mod.requires.split(" ")) {
            if (!classes.includes(req)) classes.push(req);
          }
        }
        // Add all classes for this modifier
        for (const c of modClasses) {
          if (!classes.includes(c)) classes.push(c);
        }
        if (!activeMods.includes(mod.name)) {
          activeMods.push(mod.name);
        }
      }

      props.className = classes.join(" ");
      props.root.activeModifiers = activeMods;
    });
  };

  // The resolved component type name for the selected node
  const nodeTypeName =
    query.node(id).get()?.data?.name || query.node(id).get()?.data?.displayName || "";

  const saveAsModifier = (label: string, targetType?: string) => {
    const typeName = targetType || nodeTypeName;
    if (!typeName || !label.trim()) return;

    const name = label.trim().toLowerCase().replace(/\s+/g, "-");
    const classes = currentClassName.trim();
    if (!classes) return;

    // Store modifier with classes on ROOT
    actions.setProp(ROOT_NODE, (props: any) => {
      if (!props.modifiers) props.modifiers = {};
      if (!props.modifiers[typeName]) props.modifiers[typeName] = [];
      if (props.modifiers[typeName].some((m: any) => m.name === name)) return;
      props.modifiers[typeName].push({ name, label: label.trim(), classes });
    });

    // Replace node's className with modifier name
    setProp((props: any) => {
      props.className = name;
      if (!props.root) props.root = {};
      props.root.activeModifiers = [name];
    });
  };

  return {
    allModifiers,
    grouped,
    categorized,
    isActive,
    toggleModifier,
    saveAsModifier,
    componentName,
    nodeTypeName,
    hasModifiers: allModifiers.length > 0,
  };
}
