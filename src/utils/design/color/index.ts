/**
 * Color System Utilities
 * Centralized logic for handling color formats across the application.
 *
 * Public barrel — re-exports every symbol from the focused submodules so callers
 * keep a single import path. Split from the former `colorSystem.ts` monolith;
 * see docs/sdk/splits/colorSystem.md.
 */

export type { ColorType, ParsedColor, PaletteColor } from "./types";
export {
  extractValueAfterPrefix,
  wrapInBrackets,
  removeBrackets,
  extractFirstCssHex,
  stripTailwindPrefix,
} from "./classString";
export {
  parseArbitraryOpacityInner,
  splitOpacitySuffix,
  formatTailwindOpacityModifier,
} from "./opacity";
export {
  paletteNameToVarName,
  varNameToPaletteName,
  paletteNameToShadcnVar,
  resolvePaletteReference,
} from "./paletteNames";
export { parseColorValue } from "./parseValue";
export { resolveCSSVariable } from "./resolveCssVariable";
export { getTailwindColorHex } from "./tailwindHex";
export { resolveColorForDisplay } from "./resolveDisplay";
export { formatColorForStorage } from "./formatStorage";
export { isPaletteColor, isHexColor, isTailwindClass } from "./guards";
export { hexToRGBA, applyOpacityToCssColor } from "./rgba";
export { isPaletteColorSelected } from "./isPaletteSelected";
export { TRANSPARENT_CHECKER_BG, cssColorShowsTransparency } from "./uiPrimitives";
