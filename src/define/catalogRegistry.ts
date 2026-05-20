/**
 * Catalog registry — runtime store for component presets + modifiers.
 *
 * `defineComponent` no longer carries preset/modifier arrays. Instead, each
 * `<Component>.presets.{ts,tsx}` and `.modifiers.ts` file self-registers at
 * module load via `registerPresets("Container", containerPresets)` /
 * `registerModifiers("Button", buttonModifiers)`.
 *
 * The editor (`<PageHubEditor>`) triggers built-in catalog loading via
 * `loadBuiltinCatalogs()` once at mount. Viewer / static-renderer never
 * import catalog files, so their bundles drop all preset code.
 *
 * Hosts can override per-component via `PageHubConfig.{presets,modifiers}` —
 * `register*()` is idempotent (replace by component name).
 */
import { CatalogRegistryError } from "../utils/errors";
import type { ComponentModifier, ComponentPreset } from "./types";

const presetsByName = new Map<string, ComponentPreset[]>();
const modifiersByName = new Map<string, ComponentModifier[]>();

// ─── Host catalog filter ───────────────────────────────────────────────────
//
// Constrained editor modes (e.g. email) need to drop entries that emit CSS
// the output medium can't render — backdrop-blur, transforms, animations.
// The host registers a predicate per component name; `getPresets` /
// `getModifiers` apply it at read time. See docs/sdk/host-constraints.md.

export type CatalogFilterKind = "preset" | "modifier";
export type CatalogEntry = ComponentPreset | ComponentModifier;
export type CatalogFilterPredicate = (entry: CatalogEntry, kind: CatalogFilterKind) => boolean;

const filtersByName = new Map<string, CatalogFilterPredicate>();

/**
 * Register (or replace) a per-component filter applied to that component's
 * presets and modifiers at read time. The predicate returns `true` to keep
 * the entry, `false` to drop it. Built-in catalogs are unaffected — only
 * the read result is trimmed.
 */
export function registerCatalogFilter(
  componentName: string,
  predicate: CatalogFilterPredicate
): void {
  if (!componentName || typeof componentName !== "string") {
    throw new CatalogRegistryError({
      code: "CATALOG_FILTER_INVALID_NAME",
      message: `[PageHub] registerCatalogFilter: componentName must be a non-empty string`,
      hint: 'Pass the component name as a string, e.g. registerCatalogFilter("Container", fn).',
    });
  }
  if (typeof predicate !== "function") {
    throw new CatalogRegistryError({
      code: "CATALOG_FILTER_INVALID_PREDICATE",
      message: `[PageHub] registerCatalogFilter("${componentName}"): predicate must be a function`,
    });
  }
  filtersByName.set(componentName, predicate);
}

/** Clear the filter for a component (or all components when omitted). */
export function resetCatalogFilter(componentName?: string): void {
  if (componentName) filtersByName.delete(componentName);
  else filtersByName.clear();
}

export function getCatalogFilter(componentName: string): CatalogFilterPredicate | undefined {
  return filtersByName.get(componentName);
}

// ─── Presets ───────────────────────────────────────────────────────────────

/** Register (or replace) the preset list for a component by name. */
export function registerPresets(componentName: string, presets: ComponentPreset[]): void {
  if (!componentName || typeof componentName !== "string") {
    throw new CatalogRegistryError({
      code: "CATALOG_PRESETS_INVALID_NAME",
      message: `[PageHub] registerPresets: componentName must be a non-empty string`,
    });
  }
  if (!Array.isArray(presets)) {
    throw new CatalogRegistryError({
      code: "CATALOG_PRESETS_NOT_ARRAY",
      message: `[PageHub] registerPresets("${componentName}"): presets must be an array`,
    });
  }
  for (let i = 0; i < presets.length; i++) {
    const p = presets[i];
    if (!p || typeof p !== "object") {
      throw new CatalogRegistryError({
        code: "CATALOG_PRESET_INVALID_ENTRY",
        message: `[PageHub] registerPresets("${componentName}"): presets[${i}] must be an object`,
      });
    }
    if (!p.label || typeof p.label !== "string") {
      throw new CatalogRegistryError({
        code: "CATALOG_PRESET_MISSING_LABEL",
        message: `[PageHub] registerPresets("${componentName}"): presets[${i}] is missing required string "label"`,
      });
    }
  }
  presetsByName.set(componentName, presets);
}

/** Get the preset list for a component. Returns empty array if unregistered.
 *  Applies the host catalog filter (if any) — returns a fresh array when filtered. */
export function getPresets(componentName: string): ComponentPreset[] {
  const presets = presetsByName.get(componentName);
  if (!presets) return [];
  const filter = filtersByName.get(componentName);
  if (!filter) return presets;
  return presets.filter(p => filter(p, "preset"));
}

// ─── Modifiers ─────────────────────────────────────────────────────────────

/** Register (or replace) the modifier list for a component by name. */
export function registerModifiers(componentName: string, modifiers: ComponentModifier[]): void {
  if (!componentName || typeof componentName !== "string") {
    throw new CatalogRegistryError({
      code: "CATALOG_MODIFIERS_INVALID_NAME",
      message: `[PageHub] registerModifiers: componentName must be a non-empty string`,
    });
  }
  if (!Array.isArray(modifiers)) {
    throw new CatalogRegistryError({
      code: "CATALOG_MODIFIERS_NOT_ARRAY",
      message: `[PageHub] registerModifiers("${componentName}"): modifiers must be an array`,
    });
  }
  for (let i = 0; i < modifiers.length; i++) {
    const m = modifiers[i];
    if (!m || typeof m !== "object") {
      throw new CatalogRegistryError({
        code: "CATALOG_MODIFIER_INVALID_ENTRY",
        message: `[PageHub] registerModifiers("${componentName}"): modifiers[${i}] must be an object`,
      });
    }
    if (!m.name || typeof m.name !== "string") {
      throw new CatalogRegistryError({
        code: "CATALOG_MODIFIER_MISSING_NAME",
        message: `[PageHub] registerModifiers("${componentName}"): modifiers[${i}] is missing required string "name"`,
      });
    }
    if (!m.label || typeof m.label !== "string") {
      throw new CatalogRegistryError({
        code: "CATALOG_MODIFIER_MISSING_LABEL",
        message: `[PageHub] registerModifiers("${componentName}"): modifiers[${i}] (name="${m.name}") is missing required string "label"`,
      });
    }
  }
  modifiersByName.set(componentName, modifiers);
}

/** Get the modifier list for a component. Returns empty array if unregistered.
 *  Applies the host catalog filter (if any) — returns a fresh array when filtered. */
export function getModifiers(componentName: string): ComponentModifier[] {
  const modifiers = modifiersByName.get(componentName);
  if (!modifiers) return [];
  const filter = filtersByName.get(componentName);
  if (!filter) return modifiers;
  return modifiers.filter(m => filter(m, "modifier"));
}
