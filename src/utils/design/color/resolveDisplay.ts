import colors from "tailwindcss/colors";
import type { PaletteColor } from "./types";
import { removeBrackets } from "./classString";
import { varNameToPaletteName } from "./paletteNames";
import { splitOpacitySuffix } from "./opacity";
import { applyOpacityToCssColor } from "./rgba";
import { parseColorValue } from "./parseValue";
import { getTailwindColorHex } from "./tailwindHex";
import { oklchToHex } from "../contentColor";

/**
 * Resolve opaque color from utility tail (no /opacity suffix — use splitOpacitySuffix first).
 */
function resolveColorForDisplayCore(
  bg: string,
  palette: PaletteColor[]
): { backgroundColor: string } {
  // Handle CSS variables (e.g., "var(--primary)")
  if (bg.includes("var(--")) {
    const varMatch = bg.match(/var\(--([^)]+)\)/);
    if (varMatch) {
      const paletteName = varNameToPaletteName(varMatch[1]);

      const paletteColor = palette.find(p => p.name === paletteName);
      if (paletteColor) {
        return resolveColorForDisplayCore(paletteColor.color, palette);
      }
    }
  }

  // Handle oklch values — convert to hex for display
  if (bg.startsWith("oklch(")) {
    return { backgroundColor: oklchToHex(bg) };
  }

  // Handle hex/rgba/rgb values
  if (bg.includes("#") || bg.includes("rgba") || bg.includes("rgb")) {
    const cleanColor = removeBrackets(bg);
    return { backgroundColor: cleanColor };
  }

  // Special cases
  if (bg === "white") return { backgroundColor: "#ffffff" };
  if (bg === "black") return { backgroundColor: "#000000" };
  if (bg === "transparent") return { backgroundColor: "transparent" };

  const cleanBg = removeBrackets(bg);

  // Tailwind default palette only (e.g. "blue-500") — not theme tokens like "primary-content"
  const twParts = cleanBg.split("-");
  if (twParts.length === 2) {
    const colorKey = twParts[0].toLowerCase();
    const shade = twParts[1];
    const colorObj = colors[colorKey as keyof typeof colors] as unknown;
    if (
      colorObj &&
      typeof colorObj === "object" &&
      Object.prototype.hasOwnProperty.call(colorObj, shade)
    ) {
      const hex = getTailwindColorHex(colorKey, shade);
      return { backgroundColor: hex };
    }
  }

  // Design system token tail (e.g. "primary", "primary-content", "base-100")
  if (/^[a-z][a-z0-9-]*$/i.test(cleanBg)) {
    const paletteName = varNameToPaletteName(cleanBg);
    const paletteColor = palette.find(p => p.name === paletteName);
    if (paletteColor) {
      return resolveColorForDisplayCore(paletteColor.color, palette);
    }
  }

  // Fallback to gray
  return { backgroundColor: "#e5e7eb" };
}

/**
 * Resolve a color value to its actual CSS color for display
 * Handles CSS variables, palette colors, Tailwind classes, hex, rgba, Tailwind v4 /opacity.
 */
export const resolveColorForDisplay = (
  value: string,
  prefix: string,
  palette: PaletteColor[] = []
): { backgroundColor: string } => {
  const [bgRaw] = parseColorValue(value, prefix);

  if (!bgRaw) {
    return { backgroundColor: "var(--muted)" };
  }

  const { base, opacity: opacityMod } = splitOpacitySuffix(bgRaw.trim());
  const resolved = resolveColorForDisplayCore(base, palette);

  if (opacityMod != null && opacityMod < 1 - 1e-6) {
    if (opacityMod <= 0) {
      return { backgroundColor: "rgba(0,0,0,0)" };
    }
    return { backgroundColor: applyOpacityToCssColor(resolved.backgroundColor, opacityMod) };
  }

  return resolved;
};
