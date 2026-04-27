import type { DesignSystemVars } from "./designSystemVars";

/**
 * Resolve theme data from ROOT props.
 * Reads from `props.theme` — the single source of truth.
 */
export function resolveTheme(props: Record<string, any>): DesignSystemVars {
  const t = props.theme || {};
  return {
    palette: t.palette || [],
    darkPalette: t.darkPalette || undefined,
    darkModeEnabled: t.darkModeEnabled || false,
    styleGuide: t.styleGuide || {},
    typography: t.typography || [],
    breakpoints: t.breakpoints || undefined,
  };
}

/**
 * Write theme data onto ROOT props using the new unified `theme` key.
 * Mutates the props object in-place (designed for use inside CraftJS setProp callbacks).
 */
export function writeTheme(props: Record<string, any>, theme: DesignSystemVars): void {
  props.theme = theme;
}
