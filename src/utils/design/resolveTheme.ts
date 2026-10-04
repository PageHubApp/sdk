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
  };
}

/**
 * Write theme data onto ROOT props using the new unified `theme` key.
 * Mutates the props object in-place (designed for use inside CraftJS setProp callbacks).
 */
export function writeTheme(props: Record<string, any>, theme: DesignSystemVars): void {
  props.theme = theme;
}
