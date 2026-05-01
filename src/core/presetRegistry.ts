/**
 * Lookup for runtime-only preset config (functions don't survive JSON).
 *
 * `defineComponent` presets can declare an `addChild` config — a label +
 * factory that returns one new child for the wrapper. The wrapper carries
 * `node.data.custom.preset = <label>` once dropped, and the inspector
 * property registry uses `getPresetMeta(label)` to surface the Add Item /
 * delete UI.
 *
 * Defs are registered via {@link setPresetRegistryDefs} from
 * `builtinComponentDefs.ts` at module load. Static-importing
 * `BUILTIN_COMPONENT_DEFS` here would form a cycle:
 *   ContainerMainTab → registry/properties → preset.ts → presetRegistry →
 *   BUILTIN_COMPONENT_DEFS → definitions.ts → *.craft.tsx →
 *   defineComponent({ settings: ContainerMainTab, … })
 * which TDZ-crashes on `AutomaticDef` / `ContainerDef` in production builds.
 * See [.claude/known-issues/sdk-circular-import-via-lib.md].
 */
import type { PresetAddChildConfig, ResolvedComponentDef } from "../define/types";
import { getPresets } from "../define/catalogRegistry";

export type { PresetAddChildConfig };

interface PresetMeta {
  addChild?: PresetAddChildConfig;
}

let _registeredDefs: ResolvedComponentDef[] | undefined;

export function setPresetRegistryDefs(defs: ResolvedComponentDef[]) {
  _registeredDefs = defs;
}

export function getPresetMeta(name: string | undefined): PresetMeta | undefined {
  if (!name || !_registeredDefs) return undefined;
  for (const def of _registeredDefs) {
    for (const preset of getPresets(def.name)) {
      if (preset.label === name && preset.addChild) {
        return { addChild: preset.addChild };
      }
    }
  }
  return undefined;
}
