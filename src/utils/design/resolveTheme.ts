import type { DesignSystemVars } from "./designSystemVars";
import { sanitizeSiteAnimations } from "../animations/siteAnimations";

/**
 * Resolve theme data from ROOT props.
 * Reads from `props.theme` — the single source of truth.
 */
export function resolveTheme(props: Record<string, any>): DesignSystemVars {
  const t = props.theme || {};
  return {
    // Keep keys this function doesn't normalise (styleGuideMeta, …) so
    // `writeTheme({ ...resolveTheme(p), x })` never deletes them.
    ...t,
    palette: t.palette || [],
    darkPalette: t.darkPalette || undefined,
    darkModeEnabled: t.darkModeEnabled || false,
    styleGuide: t.styleGuide || {},
    typography: t.typography || [],
    breakpoints: t.breakpoints || undefined,
    animations: sanitizeSiteAnimations(t.animations),
    // Missing = on: every site made before the toggle keeps DaisyUI.
    daisyui: t.daisyui !== false,
  };
}

/** The attribute the site root carries when DaisyUI component styles are off. */
export const DAISYUI_ATTR = "data-daisyui";

/** `{ "data-daisyui": "off" }` for a ROOT whose theme turns DaisyUI off, else `{}`. */
export function daisyUIRootAttrs(props: Record<string, any>): Record<string, string> {
  return resolveTheme(props).daisyui ? {} : { [DAISYUI_ATTR]: "off" };
}

/**
 * Write theme data onto ROOT props using the new unified `theme` key.
 * Mutates the props object in-place (designed for use inside CraftJS setProp callbacks).
 */
export function writeTheme(props: Record<string, any>, theme: DesignSystemVars): void {
  props.theme = theme;
}
