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
export function expandModifiersInNodes(nodes: Record<string, any>): Record<string, any> {
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

/** Craft `custom` key: library insert carries block `modifiers` until merged into ROOT (one undo step). */
export const PH_PENDING_BLOCK_MODIFIERS_KEY = "phPendingBlockModifiers";

/**
 * Merge library/block `modifiers` into root props (same semantics as mcp-core `mergeBlockModifiersIntoRoot`).
 *
 * **Contract mirror:** Keep in lockstep with `packages/mcp-core/src/helpers/modifiers.js`.
 * If upsert rules change, update both — no shared package by design.
 *
 * Mutates `rootProps` (initializes `modifiers` if missing).
 */
export function mergeBlockModifiersIntoRootProps(
  rootProps: Record<string, any>,
  blockModifiers: Record<string, ModifierDef[]> | null | undefined
): void {
  if (!blockModifiers || typeof blockModifiers !== "object") return;
  if (!rootProps.modifiers) rootProps.modifiers = {};

  for (const [typeName, mods] of Object.entries(blockModifiers)) {
    if (!Array.isArray(mods)) continue;
    if (!rootProps.modifiers[typeName]) rootProps.modifiers[typeName] = [];
    const bucket = rootProps.modifiers[typeName] as ModifierDef[];
    for (const mod of mods) {
      if (!mod?.name) continue;
      const idx = bucket.findIndex(m => m?.name === mod.name);
      if (idx >= 0) bucket[idx] = mod;
      else bucket.push(mod);
    }
  }
}

function expandStructureNode(node: any, map: Map<string, string>): any {
  if (!node || typeof node !== "object") return node;
  const out = { ...node };
  if (out.props && typeof out.props === "object") {
    const p = { ...out.props };
    if (typeof p.className === "string" && map.size > 0) {
      p.className = expandModifierClassName(p.className, map);
    }
    out.props = p;
  }
  if (Array.isArray(out.children)) {
    out.children = out.children.map((ch: any) => expandStructureNode(ch, map));
  }
  return out;
}

function cloneStructureJson(structure: any): any {
  try {
    return JSON.parse(JSON.stringify(structure));
  } catch {
    return structure;
  }
}

/**
 * Deep-clone `structure` and expand every `props.className` using a **pre-built** expansion map.
 * Does not mutate `structure`. Prefer this when the caller already ran `buildModifierExpansionMap`.
 */
export function expandStructureWithModifierMap(
  structure: any,
  expansionMap: Map<string, string>
): any {
  if (!structure || typeof structure !== "object") return structure;
  if (expansionMap.size === 0) return cloneStructureJson(structure);
  const cloned = cloneStructureJson(structure);
  return expandStructureNode(cloned, expansionMap);
}

/**
 * Deep-clone `structure` and expand modifier shortcut tokens in every `props.className`
 * using `blockModifiers` (library block shape). For previews only — does not mutate input.
 */
export function expandStructureWithModifiers(
  structure: any,
  blockModifiers: Record<string, ModifierDef[]> | null | undefined
): any {
  if (!structure || typeof structure !== "object") return structure;
  if (!blockModifiers || typeof blockModifiers !== "object") {
    return cloneStructureJson(structure);
  }
  if (Object.keys(blockModifiers).length === 0) {
    return cloneStructureJson(structure);
  }
  const map = buildModifierExpansionMap(blockModifiers);
  return expandStructureWithModifierMap(structure, map);
}
