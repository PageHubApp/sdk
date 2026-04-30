import { ROOT_NODE } from "@craftjs/utils";
import { useEditor, useNode } from "@craftjs/core";
import { useMemo, useRef } from "react";
import type { ComponentModifier } from "@/define";

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
  // Per-modifier override wins — first non-empty hint in the group decides.
  const hinted = mods.find(m => (m as any).renderAs)?.renderAs as ModifierRenderType | undefined;
  if (hinted) return hinted;
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
    activeModifiers: (node.data?.props?.root?.activeModifiers as string[]) || [],
    currentClassName: (node.data?.props?.className as string) || "",
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
    // Tracked state is authoritative once expansion has run.
    if (activeModifiers.includes(mod.name)) return true;
    // If we have ANY tracked active modifier in the same exclusive category,
    // treat this one as inactive — exclusive siblings don't subset-match
    // each other (one's expanded classes are often a subset of another's).
    if (mod.exclusive && mod.category && activeModifiers.length > 0) {
      // Only short-circuit if a tracked entry actually shares this category
      const sharesCategory = allModifiers.some(
        m =>
          m.exclusive &&
          m.category === mod.category &&
          activeModifiers.includes(m.name) &&
          m.name !== mod.name
      );
      if (sharesCategory) return false;
    }
    const current = currentClassName.split(/\s+/);
    // Pre-expansion: the raw modifier name is still in className.
    if (current.includes(mod.name)) return true;
    // For composite modifiers, fall back to "all expanded classes present".
    if (mod.classes) {
      const needed = resolveClasses(mod);
      return needed.every(c => current.includes(c));
    }
    return false;
  };

  /** Pure toggle: takes a baseline (className + activeModifiers) and returns the post-toggle state. */
  const computeToggle = (
    mod: ResolvedModifier,
    baseClassName: string,
    baseActiveMods: string[]
  ): { className: string; activeModifiers: string[] } => {
    let classes = baseClassName.split(/\s+/).filter(Boolean);
    let activeMods = [...baseActiveMods];

    const modClasses = resolveClasses(mod);
    const wasActive =
      baseActiveMods.includes(mod.name) ||
      (mod.classes ? modClasses.every(c => classes.includes(c)) : classes.includes(mod.name));

    // If exclusive and turning ON, clear sibling category mods first
    if (mod.exclusive && mod.category && !wasActive) {
      const siblings = allModifiers.filter(m => m.category === mod.category && m.name !== mod.name);
      for (const sib of siblings) {
        const sibClasses = resolveClasses(sib);
        classes = classes.filter((c: string) => !sibClasses.includes(c));
        activeMods = activeMods.filter((n: string) => n !== sib.name);
      }
    }

    if (wasActive) {
      classes = classes.filter((c: string) => !modClasses.includes(c));
      activeMods = activeMods.filter((n: string) => n !== mod.name);
    } else {
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
      if (mod.requires) {
        for (const req of mod.requires.split(" ")) {
          if (!classes.includes(req)) classes.push(req);
        }
      }
      for (const c of modClasses) {
        if (!classes.includes(c)) classes.push(c);
      }
      if (!activeMods.includes(mod.name)) {
        activeMods.push(mod.name);
      }
    }

    return { className: classes.join(" "), activeModifiers: activeMods };
  };

  const toggleModifier = (mod: ResolvedModifier) => {
    setProp((props: any) => {
      if (!props.root) props.root = {};
      const next = computeToggle(
        mod,
        (props.className || "") as string,
        (props.root.activeModifiers || []) as string[]
      );
      props.className = next.className;
      props.root.activeModifiers = next.activeModifiers;
    });
  };

  // Hover preview: snapshot original state on first hover, restore on leave.
  // Each hover applies the toggle against the SNAPSHOT (not the previously-hovered
  // state) so previews always show "what clicking from the original state would do."
  const previewSnapshotRef = useRef<{ className: string; activeModifiers: string[] } | null>(null);

  const previewModifier = (mod: ResolvedModifier) => {
    if (!previewSnapshotRef.current) {
      previewSnapshotRef.current = {
        className: currentClassName,
        activeModifiers: [...activeModifiers],
      };
    }
    const snap = previewSnapshotRef.current;
    const next = computeToggle(mod, snap.className, snap.activeModifiers);
    setProp((props: any) => {
      if (!props.root) props.root = {};
      props.className = next.className;
      props.root.activeModifiers = next.activeModifiers;
    });
  };

  const endPreview = () => {
    const snap = previewSnapshotRef.current;
    if (!snap) return;
    previewSnapshotRef.current = null;
    setProp((props: any) => {
      if (!props.root) props.root = {};
      props.className = snap.className;
      props.root.activeModifiers = [...snap.activeModifiers];
    });
  };

  /** Click handler: commit the currently-previewed state, or toggle directly if no preview is active (touch/no-hover). */
  const commitModifier = (mod: ResolvedModifier) => {
    if (previewSnapshotRef.current) {
      // Preview already applied the desired state — just drop the snapshot so endPreview won't revert.
      previewSnapshotRef.current = null;
    } else {
      toggleModifier(mod);
    }
  };

  // The resolved component type name for the selected node
  const nodeTypeName =
    query.node(id).get()?.data?.name || query.node(id).get()?.data?.displayName || "";

  const saveAsModifier = (label: string, targetType?: string, customClasses?: string) => {
    const typeName = targetType || nodeTypeName;
    if (!typeName || !label.trim()) return;

    const name = label.trim().toLowerCase().replace(/\s+/g, "-");
    // When the caller curates a subset of the current className (Save panel
    // lets the user prune tokens before saving), use that. Otherwise fall
    // back to the full current className.
    const classes = (customClasses ?? currentClassName).trim();
    if (!classes) return;

    // Store modifier with classes on ROOT
    actions.setProp(ROOT_NODE, (props: any) => {
      if (!props.modifiers) props.modifiers = {};
      if (!props.modifiers[typeName]) props.modifiers[typeName] = [];
      if (props.modifiers[typeName].some((m: any) => m.name === name)) return;
      props.modifiers[typeName].push({ name, label: label.trim(), classes });
    });

    // Keep expanded classes in className — track modifier as metadata only
    setProp((props: any) => {
      if (!props.root) props.root = {};
      props.root.activeModifiers = [name];
      props.root.modifierClasses = { [name]: classes };
    });
  };

  return {
    allModifiers,
    grouped,
    categorized,
    isActive,
    toggleModifier,
    previewModifier,
    commitModifier,
    endPreview,
    saveAsModifier,
    componentName,
    nodeTypeName,
    currentClassName,
    hasModifiers: allModifiers.length > 0,
  };
}
