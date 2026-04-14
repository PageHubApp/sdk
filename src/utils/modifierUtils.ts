/**
 * Modifier expansion utilities.
 *
 * Modifiers are named class presets stored on ROOT.props.modifiers.
 * Nodes reference them by name in className (e.g. "icon-button").
 * This module expands those names into real Tailwind/DaisyUI class tokens
 * so every rendering path sees actual classes — no @utility @apply needed.
 */

interface ModifierDef {
  name: string;
  classes?: string;
  requires?: string;
}

// ── Expansion map ──────────────────────────────────────────────────────────

/**
 * Build a { modifierName → "class1 class2 ..." } lookup from ROOT.props.modifiers.
 * Includes `requires` classes prepended (e.g. "btn" base for "btn-primary" variant).
 */
export function buildModifierExpansionMap(
  modifiers: Record<string, ModifierDef[]>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const mods of Object.values(modifiers)) {
    if (!Array.isArray(mods)) continue;
    for (const mod of mods) {
      if (!mod?.name || !mod?.classes) continue;
      const parts: string[] = [];
      if (mod.requires) {
        for (const req of mod.requires.split(/\s+/)) {
          if (req) parts.push(req);
        }
      }
      for (const cls of mod.classes.split(/\s+/)) {
        if (cls && !parts.includes(cls)) parts.push(cls);
      }
      map.set(mod.name, parts.join(" "));
    }
  }
  return map;
}

// ── Single className expansion ─────────────────────────────────────────────

/**
 * Replace modifier names in a className string with their expanded classes.
 * Non-modifier tokens pass through unchanged. Deduplicates the result.
 */
export function expandModifierClassName(
  className: string,
  expansionMap: Map<string, string>
): string {
  if (!className || expansionMap.size === 0) return className;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const token of className.split(/\s+/)) {
    if (!token) continue;
    const expanded = expansionMap.get(token);
    if (expanded) {
      for (const cls of expanded.split(/\s+/)) {
        if (cls && !seen.has(cls)) {
          seen.add(cls);
          result.push(cls);
        }
      }
    } else if (!seen.has(token)) {
      seen.add(token);
      result.push(token);
    }
  }
  return result.join(" ");
}

// ── Full node map expansion ────────────────────────────────────────────────

/**
 * Walk a CraftJS node map and expand modifier names in every node's className.
 * Also populates `root.activeModifiers` and `root.modifierClasses` metadata
 * so the editor knows which modifiers are active and can update them centrally.
 *
 * Mutates and returns the same object (no deep clone — caller owns the data).
 */
export function expandModifiersInNodes(
  nodes: Record<string, any>
): Record<string, any> {
  const modifiers = nodes?.ROOT?.props?.modifiers;
  if (!modifiers || typeof modifiers !== "object") return nodes;

  const map = buildModifierExpansionMap(modifiers as Record<string, ModifierDef[]>);
  if (map.size === 0) return nodes;

  for (const [nodeId, node] of Object.entries(nodes)) {
    if (nodeId === "ROOT") continue;
    const props = node?.props;
    if (!props || typeof props.className !== "string") continue;

    const original = props.className;
    const tokens = original.split(/\s+/).filter(Boolean);

    // Find which tokens are modifier names
    const activeModifiers: string[] = [];
    const modifierClasses: Record<string, string> = {};
    let needsExpansion = false;

    for (const token of tokens) {
      if (map.has(token)) {
        activeModifiers.push(token);
        modifierClasses[token] = map.get(token)!;
        needsExpansion = true;
      }
    }

    if (!needsExpansion) continue;

    // Expand className
    props.className = expandModifierClassName(original, map);

    // Set metadata
    if (!props.root) props.root = {};
    props.root.activeModifiers = activeModifiers;
    props.root.modifierClasses = modifierClasses;
  }

  return nodes;
}
