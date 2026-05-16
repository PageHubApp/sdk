import { toPaletteCSSVarName } from "../utils/design/designSystemVars";
import { resolveTheme } from "../utils/design/resolveTheme";

export function generateThemeVars(rootProps: Record<string, any>): string {
  const theme = resolveTheme(rootProps);
  const sg = theme.styleGuide;
  const palette = theme.palette;

  const paletteVars = palette
    .filter((p: any) => p.name && p.color)
    .map((p: any) => `  ${toPaletteCSSVarName(p.name)}: ${p.color};`)
    .join("\n");

  const dsVars = [
    sg.borderRadius && `  --radius: ${sg.borderRadius};`,
    sg.buttonPadding && `  --button-padding: ${sg.buttonPadding};`,
    sg.containerPadding && `  --container-padding: ${sg.containerPadding};`,
    sg.sectionGap && `  --section-gap: ${sg.sectionGap};`,
    sg.containerGap && `  --container-gap: ${sg.containerGap};`,
    sg.contentWidth && `  --content-width: ${sg.contentWidth};`,
    // --font-sans / --font-serif legacy: now sourced from theme.typography[] Heading/Body
    (() => {
      const h = (theme.typography || []).find((t: any) => t?.name === "Heading");
      return h?.fontFamily ? `  --font-sans: ${h.fontFamily};` : null;
    })(),
    (() => {
      const b = (theme.typography || []).find((t: any) => t?.name === "Body");
      return b?.fontFamily ? `  --font-serif: ${b.fontFamily};` : null;
    })(),
    sg.inputBorderWidth && `  --input-border-width: ${sg.inputBorderWidth};`,
    sg.inputBorderColor && `  --input-border-color: ${sg.inputBorderColor};`,
    sg.inputBorderRadius && `  --input-border-radius: ${sg.inputBorderRadius};`,
    sg.inputPadding && `  --input-padding: ${sg.inputPadding};`,
    sg.inputBgColor && `  --input-bg-color: ${sg.inputBgColor};`,
    sg.inputTextColor && `  --input-text-color: ${sg.inputTextColor};`,
    sg.inputPlaceholderColor && `  --input-placeholder-color: ${sg.inputPlaceholderColor};`,
    sg.inputFocusRing && `  --input-focus-ring: ${sg.inputFocusRing};`,
    sg.inputFocusRingColor && `  --input-focus-ring-color: ${sg.inputFocusRingColor};`,
  ]
    .filter(Boolean)
    .join("\n");

  // `.ph-icon-svg` lets the SVG fill its sized parent (e.g. `w-6 h-6` span)
  // once CSS lands. Class-based instead of width="100%" attribute so the SVG
  // falls back to viewBox-intrinsic size (24×24) during the FOUC window
  // instead of the browser default (300×150 or larger). Shipped on every page.
  const baseUtilities = `.ph-icon-svg{width:100%;height:100%;display:block}`;

  return `:root {\n${paletteVars}\n${dsVars}\n}\n${baseUtilities}`;
}

/** `:root { … }` from ROOT/Background theme (palette + styleGuide) for static hand-off zips. */
export function buildRootThemeCss(rootProps: Record<string, any>): string {
  return generateThemeVars(rootProps);
}
