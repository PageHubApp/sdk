import colors from "tailwindcss/colors";
import type { PaletteColor } from "./types";
import { splitOpacitySuffix } from "./opacity";
import { varNameToPaletteName } from "./paletteNames";

/**
 * Check if a palette color is selected based on current value
 */
export const isPaletteColorSelected = (
  currentValue: string | { r: number; g: number; b: number; a: number } | any,
  paletteColor: PaletteColor
): boolean => {
  if (!currentValue) return false;

  // Convert RGB object to string if needed
  let valueString: string;
  if (typeof currentValue === "object" && currentValue.r !== undefined) {
    valueString = `rgba(${currentValue.r},${currentValue.g},${currentValue.b},${currentValue.a})`;
  } else if (typeof currentValue === "string") {
    valueString = currentValue;
  } else {
    return false; // Invalid type
  }

  const opaqueValue = splitOpacitySuffix(valueString.trim()).base;

  // Handle palette reference format
  if (opaqueValue.includes("palette:")) {
    const match = opaqueValue.match(/palette:(.+)$/);
    if (match) {
      const extractedName = splitOpacitySuffix(match[1].trim()).base;
      return extractedName === paletteColor.name.trim();
    }
  }

  // Handle CSS variable format (e.g., "var(--primary)")
  if (opaqueValue.includes("var(--")) {
    const match = opaqueValue.match(/var\(--([^)]+)\)/);
    if (match) {
      const paletteName = varNameToPaletteName(match[1]);
      return paletteName === paletteColor.name.trim();
    }
  }

  // Plain token tail (e.g. "primary-content" from text-primary-content) — same names as CSS vars / palette
  const trimmed = opaqueValue.trim();
  if (
    trimmed &&
    /^[a-z][a-z0-9-]*$/i.test(trimmed) &&
    !opaqueValue.includes("palette:") &&
    !opaqueValue.includes("var(--")
  ) {
    const parts = trimmed.split("-");
    const isTailwindTwoPart =
      parts.length === 2 &&
      (() => {
        const colorKey = parts[0].toLowerCase();
        const shade = parts[1];
        const colorObj = colors[colorKey as keyof typeof colors] as unknown;
        return Boolean(
          colorObj &&
          typeof colorObj === "object" &&
          Object.prototype.hasOwnProperty.call(colorObj, shade)
        );
      })();
    if (!isTailwindTwoPart) {
      const paletteName = varNameToPaletteName(trimmed);
      if (paletteName === paletteColor.name.trim()) return true;
    }
  }

  // Direct color value comparison
  if (valueString === paletteColor.color) {
    return true;
  }

  // Handle RGB object comparison
  if (typeof currentValue === "object" && (currentValue as any).r !== undefined) {
    const rgb = currentValue as { r: number; g: number; b: number; a: number };
    const rgbaStr = `rgba(${rgb.r},${rgb.g},${rgb.b},${rgb.a})`;
    return paletteColor.color === rgbaStr;
  }

  return false;
};
