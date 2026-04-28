/**
 * Lookup for runtime-only preset config (functions don't survive JSON).
 *
 * `defineComponent` presets can declare an `addChild` config — a label +
 * factory that returns one new child for the wrapper. The wrapper carries
 * `node.data.custom.preset = <label>` once dropped, and the unified-settings
 * property registry uses `getPresetMeta(label)` to surface the Add Item /
 * delete UI.
 *
 * Lookup walks `BUILTIN_COMPONENT_DEFS` directly — single source of truth,
 * no parallel registry. Re-exports `PresetAddChildConfig` from `define.ts`
 * for backwards-compat callers.
 */
import { BUILTIN_COMPONENT_DEFS } from "./builtinComponentDefs";
import type { PresetAddChildConfig } from "../define";

export type { PresetAddChildConfig };

interface PresetMeta {
  addChild?: PresetAddChildConfig;
}

export function getPresetMeta(name: string | undefined): PresetMeta | undefined {
  if (!name) return undefined;
  for (const def of BUILTIN_COMPONENT_DEFS) {
    for (const preset of def.presets) {
      if (preset.label === name && preset.addChild) {
        return { addChild: preset.addChild };
      }
    }
  }
  return undefined;
}
