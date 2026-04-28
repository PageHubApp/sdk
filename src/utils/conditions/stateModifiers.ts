/**
 * State-bound modifier resolver.
 *
 * A node's `props.stateModifiers` declares "when condition group X passes,
 * apply these modifier names." At render time we evaluate each binding,
 * expand matching modifier names to their classes via the same
 * registered-modifier list authored under design-time, and append to
 * className. No data attributes, no runtime-stamped magic — just a one-way
 * className composer driven by the conditions evaluator.
 */

import type { ComponentModifier } from "../../define";
import { BUILTIN_STATE_MODIFIERS } from "./stateBuiltinModifiers";
import { evaluateConditionGroups } from "./evaluate";
import type { ConditionContext, ConditionGroup } from "./types";

export interface StateBinding {
  conditions: ConditionGroup[];
  /** Modifier names — looked up against the node's available modifiers. */
  modifiers: string[];
}

/** Resolve a modifier to its actual class list (mirrors useModifiers.ts:64). */
function resolveModifierClasses(mod: ComponentModifier): string[] {
  if (mod.classes) return mod.classes.split(/\s+/).filter(Boolean);
  return [mod.name];
}

/**
 * Append classes for matching state bindings onto a base className. ONLY
 * applies on a confirmed `true` evaluation. Indeterminate (`null`) and
 * `false` are both treated as "don't apply" — opposite of visibility's
 * graceful-degrade-to-shown, because for STYLING we'd rather render the
 * baseline than flash active classes before state is written. (e.g. tab
 * buttons paint inactive on first render until the user clicks one.)
 *
 * Modifier lookup reads from a viewer-safe registry (`BUILTIN_STATE_MODIFIERS`)
 * — the full `BUILTIN_COMPONENT_DEFS` array transitively pulls every
 * `.craft.tsx` file (and its editor toolbar imports) into the viewer
 * bundle, which we explicitly want to avoid. Reading `Component.craft.toolbar.modifiers`
 * also doesn't work outside the editor because viewer routes use
 * `processForViewer` which never calls `attachCraft`.
 */
export function applyStateModifiers(
  className: string,
  bindings: StateBinding[] | undefined,
  ctx: ConditionContext,
  componentName: string,
  rootProps: any
): string {
  if (!bindings || bindings.length === 0) return className;

  const builtin = BUILTIN_STATE_MODIFIERS[componentName] ?? [];
  const siteSaved =
    (rootProps?.modifiers?.[componentName] as ComponentModifier[] | undefined) ?? [];
  const available = builtin.concat(siteSaved);

  const byName = new Map<string, ComponentModifier>();
  for (const m of available) byName.set(m.name, m);

  const out: string[] = className ? [className] : [];
  for (const binding of bindings) {
    const result = evaluateConditionGroups(binding.conditions, ctx);
    if (result !== true) continue;
    if (!Array.isArray(binding.modifiers)) continue;
    for (const name of binding.modifiers) {
      const mod = byName.get(name);
      if (!mod) continue;
      for (const cls of resolveModifierClasses(mod)) {
        if (!out.includes(cls)) out.push(cls);
      }
    }
  }
  return out.join(" ");
}
