/**
 * Schema-driven className inheritance from a same-name sibling (e.g. new Button next to existing Buttons in a Container).
 * Uses component def `peerInherit` + modifier metadata; supplements with raw Tailwind tokens
 * (rounded-*, border*, …) templates often use without modifier names.
 */

import type { ComponentModifier } from "../../define";
import { getBuiltinComponentDef } from "../../core/builtinDefsLookup";

function resolveModifierClassTokens(mod: ComponentModifier): string[] {
  if (mod.classes) return mod.classes.split(/\s+/).filter(Boolean);
  if (mod.expands) return mod.expands.split(/\s+/).filter(Boolean);
  return [mod.name];
}

function classNameHasRequires(className: string, requires?: string): boolean {
  if (!requires?.trim()) return true;
  const tokens = new Set(className.split(/\s+/).filter(Boolean));
  return requires
    .split(/\s+/)
    .filter(Boolean)
    .every(t => tokens.has(t));
}

/** True if this modifier reads as active on reference className (aligned with useModifiers isActive, className-only). */
function isModifierActiveOnClassName(refClassName: string, mod: ComponentModifier): boolean {
  if (!classNameHasRequires(refClassName, mod.requires)) return false;
  const tokens = refClassName.split(/\s+/).filter(Boolean);
  const set = new Set(tokens);
  const needed = resolveModifierClassTokens(mod);
  return needed.every(c => set.has(c));
}

function participatesInPeerInherit(mod: ComponentModifier): boolean {
  if (mod.peerInherit === false) return false;
  if (mod.peerInherit === true) return true;
  return mod.category !== "State";
}

function applyRemovesFilter(classes: string[], mod: ComponentModifier): string[] {
  if (!mod.removes?.length) return classes;
  return classes.filter(c => {
    for (const pattern of mod.removes!) {
      if (pattern.endsWith("*")) {
        const prefix = pattern.slice(0, -1);
        if (c.startsWith(prefix)) return false;
      } else if (c === pattern) return false;
    }
    return true;
  });
}

function applyModifierTurnOn(
  classes: string[],
  mod: ComponentModifier,
  allMods: ComponentModifier[]
): void {
  if (mod.exclusive && mod.category) {
    const siblings = allMods.filter(
      m =>
        m.category === mod.category &&
        m.exclusive &&
        m.name !== mod.name &&
        participatesInPeerInherit(m)
    );
    for (const sib of siblings) {
      const sibTokens = resolveModifierClassTokens(sib);
      for (let i = classes.length - 1; i >= 0; i--) {
        if (sibTokens.includes(classes[i]!)) classes.splice(i, 1);
      }
    }
  }

  let next = applyRemovesFilter([...classes], mod);

  if (mod.requires) {
    for (const req of mod.requires.split(/\s+/).filter(Boolean)) {
      if (!next.includes(req)) next.push(req);
    }
  }

  const modTokens = resolveModifierClassTokens(mod);
  for (const c of modTokens) {
    if (!next.includes(c)) next.push(c);
  }

  classes.length = 0;
  classes.push(...next);
}

/** Raw Tailwind tokens often used on buttons but not always represented as named modifiers. */
function isRawPeerToken(t: string): boolean {
  if (t.startsWith("btn")) return false;
  if (t.startsWith("rounded") || t.startsWith("!rounded")) return true;
  if (t === "border" || t.startsWith("border-")) return true;
  if (t === "uppercase" || t === "lowercase" || t === "capitalize") return true;
  if (t.startsWith("tracking-")) return true;
  if (/^font-(bold|semibold|medium|normal|black)$/.test(t)) return true;
  if (/^text-(xs|sm|base|lg|xl|2xl)$/.test(t)) return true;
  if (
    t.startsWith("px-") ||
    t.startsWith("py-") ||
    t.startsWith("min-h-") ||
    t.startsWith("min-w-")
  )
    return true;
  if (t.startsWith("self-")) return true;
  if (t === "w-full" || /^md:w-/.test(t) || /^sm:w-/.test(t) || /^lg:w-/.test(t)) return true;
  if (t.startsWith("gap-")) return true;
  return false;
}

function mergeRawPeerTokens(refClass: string, classes: string[]): void {
  const refTokens = refClass.split(/\s+/).filter(Boolean);
  const rawFromRef = refTokens.filter(isRawPeerToken);
  if (rawFromRef.length === 0) return;

  const stripped = classes.filter(c => !isRawPeerToken(c));
  classes.length = 0;
  classes.push(...stripped);
  for (const t of rawFromRef) {
    if (!classes.includes(t)) classes.push(t);
  }
}

/**
 * After inserting a new node, copy className chrome from a reference sibling when
 * `def.peerInherit` matches the parent context.
 *
 * `actions` may be a raw CraftJS actions object or a merged-batch handle — both
 * expose `setProp` with the same signature.
 */
export function applyPeerClassInherit(
  actions: { setProp: (id: string, fn: (props: Record<string, any>) => void) => void },
  query: { node: (id: string) => { get: () => any } },
  newNodeId: string,
  parentId: string
): void {
  const newNode = query.node(newNodeId).get();
  const name = newNode?.data?.name as string | undefined;
  if (!name) return;

  const def = getBuiltinComponentDef(name);
  const cfg = def?.peerInherit;
  if (!cfg) {
    console.log(`[peerInherit] skip ${name} ${newNodeId}: no peerInherit config on def`);
    return;
  }

  const parent = query.node(parentId).get();
  const parentName = parent?.data?.name as string | undefined;
  if (!parentName || !cfg.whenParentIs.includes(parentName)) {
    console.log(
      `[peerInherit] skip ${name} ${newNodeId}: parent ${parentName} not in [${cfg.whenParentIs.join(",")}]`
    );
    return;
  }

  const nodes: string[] = parent.data?.nodes || [];
  const idx = nodes.indexOf(newNodeId);
  if (idx < 0) return;

  // Heterogeneous parents (auto-list-grouped Container) can have non-Button
  // siblings interleaved. Reference must be a same-name sibling — otherwise
  // we'd inherit Image / Container / Text classes onto a Button. Walk left
  // first (preferred), then right.
  const isSameKind = (id: string) => {
    try {
      return query.node(id).get()?.data?.name === name;
    } catch {
      return false;
    }
  };

  let refId: string | null = null;
  const walk = (start: number, step: number) => {
    let i = start;
    while (i >= 0 && i < nodes.length) {
      if (i !== idx && isSameKind(nodes[i]!)) return nodes[i]!;
      i += step;
    }
    return null;
  };
  if (cfg.reference === "left-neighbor") {
    refId = walk(idx - 1, -1) ?? walk(idx + 1, +1);
  } else {
    refId = walk(idx + 1, +1) ?? walk(idx - 1, -1);
  }
  if (!refId || refId === newNodeId) {
    console.log(
      `[peerInherit] skip ${name} ${newNodeId}: no same-kind sibling in parent ${parentId}`
    );
    return;
  }

  const refNode = query.node(refId).get();
  const refClass = (refNode?.data?.props?.className as string) || "";
  if (!refClass.trim()) {
    console.log(
      `[peerInherit] skip ${name} ${newNodeId}: reference sibling ${refId} has empty className`
    );
    return;
  }

  const allMods = def.modifiers || [];
  const peerMods = allMods.filter(participatesInPeerInherit);

  actions.setProp(newNodeId, (props: Record<string, any>) => {
    if (!props || typeof props !== "object") return;
    const before = (props.className || "") as string;
    let classes = before.split(/\s+/).filter(Boolean);
    const activeModNames: string[] = [];

    for (const mod of peerMods) {
      if (!isModifierActiveOnClassName(refClass, mod)) continue;
      applyModifierTurnOn(classes, mod, peerMods);
      if (!activeModNames.includes(mod.name)) activeModNames.push(mod.name);
    }

    mergeRawPeerTokens(refClass, classes);

    props.className = classes.join(" ").replace(/\s+/g, " ").trim();
    if (!props.root) props.root = {};
    props.root.activeModifiers = activeModNames;

    console.log(
      `[peerInherit] applied ${name} ${newNodeId} ← ref ${refId}\n  ref:    ${refClass}\n  before: ${before}\n  after:  ${props.className}\n  mods:   [${activeModNames.join(", ")}]`
    );
  });
}
