// ── Class extraction from Craft.js JSON ──────────────────────────────────
//
// The only piece of the pipeline that touches BUILTIN_COMPONENT_DEFS / modifier
// expansion / per-component prop conventions (icon prop, root.animation). It's
// the thing that changes when a new component or new animatable prop is added.

import { BUILTIN_COMPONENT_DEFS } from "../core/builtinComponentDefs";
import { buildModifierExpansionMap, expandModifierClassName } from "../utils/modifierUtils";

export function extractCandidatesFromNodes(nodes: Record<string, any>): string[] {
  const candidates = new Set<string>();
  const implicit = [
    "cursor-pointer",
    "sr-only",
    "not-sr-only",
    "overflow-hidden",
    "relative",
    "absolute",
    // Button/Link icon wrapper defaults (Button.craft.tsx): when an author omits
    // `icon.size`, the runtime stamps `w-6 h-6` plus the hard-coded wrapper
    // classes. None of these live on any `props.className`, so they're invisible
    // to the candidate scanner.
    "w-6",
    "h-6",
    "fill-current",
    "flex",
    "items-center",
    "justify-center",
  ];
  for (const c of implicit) candidates.add(c);

  // Build modifier expansion map so modifier names get expanded to real classes.
  // Merges def-shipped built-in modifiers (e.g. "accordion-slide-fade" on
  // Container) with site-level overrides at ROOT.props.modifiers (site wins).
  const modifiers = nodes?.ROOT?.props?.modifiers;
  const expansionMap = buildModifierExpansionMap(
    modifiers && typeof modifiers === "object" ? modifiers : {},
    BUILTIN_COMPONENT_DEFS
  );

  for (const node of Object.values(nodes)) {
    const props = (node as any)?.props;
    if (!props) continue;

    if (typeof props.className === "string" && props.className.trim()) {
      const expanded =
        expansionMap.size > 0
          ? expandModifierClassName(props.className, expansionMap)
          : props.className;
      for (const cls of expanded.split(/\s+/)) if (cls) candidates.add(cls);
    }
    if (Array.isArray(props.className)) {
      for (const cls of props.className)
        if (typeof cls === "string" && cls.trim()) candidates.add(cls);
    }
    if (typeof props.helpers === "string" && props.helpers.trim()) {
      for (const cls of props.helpers.split(/\s+/)) if (cls) candidates.add(cls);
    }
    const anim = props.root?.animation;
    if (typeof anim === "string" && anim.startsWith("css")) {
      const kebab = anim.replace(/([A-Z])/g, "-$1").toLowerCase();
      candidates.add(`animate-${kebab}`);
      candidates.add("ph-anim-scroll");
    }
    const hoverClass = props.root?.hoverAnimation;
    if (typeof hoverClass === "string" && hoverClass.trim()) candidates.add(hoverClass);

    // Button/Link icon prop — `size`, `gap`, `color` are className strings the
    // renderer stamps onto the wrapper span. Pull them in so author-supplied
    // sizes (e.g. `size-5`, `w-8 h-8`) compile.
    const icon = props.icon;
    if (icon && typeof icon === "object") {
      for (const key of ["size", "gap", "color", "className"]) {
        const val = (icon as any)[key];
        if (typeof val === "string" && val.trim()) {
          for (const cls of val.split(/\s+/)) if (cls) candidates.add(cls);
        }
      }
    }
  }
  return [...candidates];
}
