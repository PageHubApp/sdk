import type { NamedColor } from "../../components/Background/Background.body";
import { toCSSVarName } from "./designSystemVars";
import { sdkLog } from "../logger";

export { PaletteProvider, usePalette } from "./PaletteContext";

/**
 * Check if a color value is a palette reference
 * Format: palette:ColorName or palette-ColorName
 */
export const isPaletteReference = (value: string): boolean => {
  if (!value || typeof value !== "string") return false;
  return value.startsWith("palette:") || value.startsWith("palette-");
};

/**
 * Check if a color value is a style reference
 * Format: style:styleName
 */
export const isStyleReference = (value: string): boolean => {
  if (!value || typeof value !== "string") return false;
  return value.startsWith("style:");
};

/**
 * Extract the palette color name from a reference
 * Example: "palette:Brand" -> "Brand"
 */
export const getPaletteName = (value: string): string => {
  if (value.startsWith("palette:")) {
    return value.substring(8);
  }
  if (value.startsWith("palette-")) {
    return value.substring(8);
  }
  return value;
};

/**
 * Extract the style name from a reference
 * Example: "style:inputBorder" -> "inputBorder"
 */
export const getStyleName = (value: string): string => {
  if (value.startsWith("style:")) {
    return value.substring(6);
  }
  return value;
};

/**
 * Create a palette reference from a color name
 * Example: "Brand" -> "palette:Brand"
 */
export const createPaletteReference = (name: string): string => {
  return `palette:${name}`;
};

/**
 * Resolve a palette reference to its actual color value
 * If not a palette reference, return the value as-is
 */
export const resolvePaletteColor = (value: string, palette: NamedColor[]): string => {
  if (!isPaletteReference(value)) {
    return value;
  }

  const name = getPaletteName(value);
  const paletteColor = palette?.find(p => p.name === name);

  if (paletteColor) {
    return paletteColor.color;
  }

  // Fallback if palette color not found
  sdkLog.warn(`Palette color "${name}" not found`);
  return value;
};

/**
 * Convert palette reference to CSS variable reference
 * Example: "palette:Primary" -> "var(--primary)"
 * Example: "palette:Primary Foreground" -> "var(--primary-foreground)"
 */
export const paletteToCSSVar = (value: string): string => {
  if (!isPaletteReference(value)) {
    return value;
  }

  const name = getPaletteName(value);
  return `var(--${toCSSVarName(name)})`;
};

/**
 * Convert style reference to CSS variable reference
 * Example: "style:inputBorder" -> "var(--input-border)"
 */
export const styleToCSSVar = (value: string): string => {
  if (!isStyleReference(value)) {
    return value;
  }

  const name = getStyleName(value);
  const varName = toCSSVarName(name);
  return `var(--${varName})`;
};

/**
 * Convert palette/style reference to Tailwind-compatible CSS variable class
 * Examples:
 *   ("palette:Primary", "bg") -> "bg-primary"
 *   ("style:inputBorder", "border") -> "border-(--input-border)"
 */
export const toTailwindCSSVar = (value: string, prefix: string = ""): string => {
  let cssVar = "";

  if (isPaletteReference(value)) {
    const name = getPaletteName(value);
    cssVar = `var(--${toCSSVarName(name)})`;
  } else if (isStyleReference(value)) {
    const name = getStyleName(value);
    const varName = toCSSVarName(name);
    cssVar = `var(--${varName})`;
  } else {
    return value;
  }

  // Return with prefix and arbitrary value syntax
  return prefix ? `${prefix}-[${cssVar}]` : `[${cssVar}]`;
};
