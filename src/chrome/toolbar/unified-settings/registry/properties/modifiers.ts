/**
 * Modifiers section property defs.
 *
 * List-style section (mirrors Conditions §8): pinned chip-list body +
 * non-pinned popover-mode picker. The picker `+` lives in the section header
 * via AccordionAddMenu's `sectionPopoverProp` path; the body chip-list is
 * gated by `isActive` so an empty / no-match state collapses the section
 * back to header-only.
 *
 * "Active" for modifiers means EITHER:
 *   - explicit tracking via `props.root.activeModifiers` (the picker writes
 *     here when toggling), OR
 *   - any className token matches a registered modifier's class (templates /
 *     Class Search can stamp a modifier's class without touching tracking).
 *
 * The second case requires reading the node type's modifier registry, which
 * `def.isActive` reaches via the `ctx.query` arg (CraftJS query). Without
 * this, a node with `hero-content` baked into className shows the section
 * expanded but with no chips — what the user reported as "holding space".
 */
import { ROOT_NODE } from "@craftjs/utils";
import type { ComponentModifier } from "../../../../../define";
import type { PropertyDef } from "../propertyDefs";

function collectModifierClassTokens(query: any, nodeId: string): Set<string> {
  const out = new Set<string>();
  try {
    const node = query.node(nodeId).get();
    const builtins =
      ((node?.data?.type as any)?.craft?.toolbar?.modifiers as ComponentModifier[] | undefined) ||
      [];
    for (const m of builtins) {
      if (m.classes) {
        for (const c of m.classes.split(/\s+/)) if (c) out.add(c);
      } else if (m.name) {
        out.add(m.name);
      }
    }
    // Site-level custom modifiers live on ROOT, keyed by component type name.
    const rootProps = query.node(ROOT_NODE).get()?.data?.props;
    const typeName = node?.data?.name || node?.data?.displayName || "";
    const siteForType =
      typeName && rootProps?.modifiers && typeof rootProps.modifiers === "object"
        ? (rootProps.modifiers[typeName] as ComponentModifier[] | undefined)
        : undefined;
    if (siteForType) {
      for (const m of siteForType) {
        if (m.classes) {
          for (const c of m.classes.split(/\s+/)) if (c) out.add(c);
        } else if (m.name) {
          out.add(m.name);
        }
      }
    }
  } catch {
    // node lookup can fail during teardown — empty set just collapses the section
  }
  return out;
}

export const modifiersProperties: PropertyDef[] = [
  {
    id: "modifiers",
    label: "Modifiers",
    section: "modifiers",
    keywords: ["modifier", "pattern", "variant", "style", "class"],
    input: { type: "custom", component: "ModifierChipList" },
    pinned: true,
    isActive: (className, props, ctx) => {
      const tracked = props?.root?.activeModifiers;
      if (Array.isArray(tracked) && tracked.length > 0) return true;
      if (!ctx) return false;
      const tokens = collectModifierClassTokens(ctx.query, ctx.nodeId);
      if (tokens.size === 0) return false;
      for (const t of className.split(/\s+/)) {
        if (t && tokens.has(t)) return true;
      }
      return false;
    },
    sortOrder: 0,
  },
  {
    id: "modifiers:add",
    label: "Add modifier",
    section: "modifiers",
    help: "Open the modifier library.",
    keywords: ["add", "modifier", "pattern", "variant"],
    input: { type: "custom", component: "ModifiersAddPicker" },
    sortOrder: 1,
  },
];
