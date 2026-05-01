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
import type { ComponentModifier, ComponentPreset } from "./types";

const presetsByName = new Map<string, ComponentPreset[]>();
const modifiersByName = new Map<string, ComponentModifier[]>();

// ─── Presets ───────────────────────────────────────────────────────────────

/** Register (or replace) the preset list for a component by name. */
export function registerPresets(componentName: string, presets: ComponentPreset[]): void {
  if (!componentName || typeof componentName !== "string") {
    throw new Error(`[PageHub] registerPresets: componentName must be a non-empty string`);
  }
  if (!Array.isArray(presets)) {
    throw new Error(`[PageHub] registerPresets("${componentName}"): presets must be an array`);
  }
  for (let i = 0; i < presets.length; i++) {
    const p = presets[i];
    if (!p || typeof p !== "object") {
      throw new Error(
        `[PageHub] registerPresets("${componentName}"): presets[${i}] must be an object`
      );
    }
    if (!p.label || typeof p.label !== "string") {
      throw new Error(
        `[PageHub] registerPresets("${componentName}"): presets[${i}] is missing required string "label"`
      );
    }
  }
  presetsByName.set(componentName, presets);
}

/** Get the preset list for a component. Returns empty array if unregistered. */
export function getPresets(componentName: string): ComponentPreset[] {
  return presetsByName.get(componentName) ?? [];
}

// ─── Modifiers ─────────────────────────────────────────────────────────────

/** Register (or replace) the modifier list for a component by name. */
export function registerModifiers(componentName: string, modifiers: ComponentModifier[]): void {
  if (!componentName || typeof componentName !== "string") {
    throw new Error(`[PageHub] registerModifiers: componentName must be a non-empty string`);
  }
  if (!Array.isArray(modifiers)) {
    throw new Error(
      `[PageHub] registerModifiers("${componentName}"): modifiers must be an array`
    );
  }
  for (let i = 0; i < modifiers.length; i++) {
    const m = modifiers[i];
    if (!m || typeof m !== "object") {
      throw new Error(
        `[PageHub] registerModifiers("${componentName}"): modifiers[${i}] must be an object`
      );
    }
    if (!m.name || typeof m.name !== "string") {
      throw new Error(
        `[PageHub] registerModifiers("${componentName}"): modifiers[${i}] is missing required string "name"`
      );
    }
    if (!m.label || typeof m.label !== "string") {
      throw new Error(
        `[PageHub] registerModifiers("${componentName}"): modifiers[${i}] (name="${m.name}") is missing required string "label"`
      );
    }
  }
  modifiersByName.set(componentName, modifiers);
}

/** Get the modifier list for a component. Returns empty array if unregistered. */
export function getModifiers(componentName: string): ComponentModifier[] {
  return modifiersByName.get(componentName) ?? [];
}
