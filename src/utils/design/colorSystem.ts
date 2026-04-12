import type { CSSProperties } from "react";
import { ROOT_NODE } from "@craftjs/core";
import colors from "tailwindcss/colors";
import { DEFAULT_STYLE_GUIDE } from "../defaults";
import { oklchToHex } from "./contentColor";
import { resolveTheme } from "./resolveTheme";

/**
 * Color System Utilities
 * Centralized logic for handling color formats across the application
 */

export type ColorType = "palette" | "hex" | "rgb" | "class";

export interface ParsedColor {
  type: ColorType;
  value: string;
  displayValue: string;
  cssValue: string;
}

export interface PaletteColor {
  name: string;
  color: string;
}

/**
 * Extract the value after the prefix
 * e.g., "bg-blue-500" with prefix "bg" returns "blue-500"
 */
export const extractValueAfterPrefix = (value: string, prefix: string): string => {
  if (!value || !prefix) return value || "";
  const parts = value.split(`${prefix}-`).filter(Boolean);
  return parts[0] || "";
};

/**
 * Wrap value in brackets if needed for arbitrary values
 * e.g., "#ffffff" becomes "[#ffffff]"
 */
export const wrapInBrackets = (val: string): string => {
  if (!val) return val;

  // Already has brackets
  if (val.includes("[")) return val;

  // Needs brackets if it's a hex/rgba value without dashes
  if (!val.includes("-") && (val.includes("#") || val.includes("rgba") || val.includes("rgb"))) {
    return `[${val}]`;
  }

  return val;
};

/**
 * Remove brackets from value
 * e.g., "[#ffffff]" becomes "#ffffff"
 */
export const removeBrackets = (val: string): string => {
  if (!val) return val;
  return val.replace(/^\[/, "").replace(/\]$/, "");
};

/**
 * Parse Tailwind v4 arbitrary opacity bracket content → alpha 0–1
 * e.g. "50%" → 0.5, "0.5" → 0.5, ".35" → 0.35
 */
export const parseArbitraryOpacityInner = (inner: string): number | null => {
  const s = inner.trim();
  if (!s) return null;
  if (s.endsWith("%")) {
    const n = parseFloat(s.slice(0, -1));
    if (Number.isNaN(n) || n < 0 || n > 100) return null;
    return n / 100;
  }
  const n = parseFloat(s);
  if (Number.isNaN(n)) return null;
  if (n > 1 && n <= 100) return n / 100;
  if (n >= 0 && n <= 1) return n;
  return null;
};

/**
 * Split a color utility tail into base + optional opacity (Tailwind v4).
 * e.g. "primary-content/50" → base + 0.5, "blue-500/[50%]" → base + 0.5,
 * "[var(--primary)]/[0.35]" → base + 0.35
 */
export const splitOpacitySuffix = (tail: string): { base: string; opacity?: number } => {
  if (!tail || !tail.includes("/")) {
    return { base: tail };
  }

  const arbitrary = tail.match(/^(.+)\/(\[[^\]]+\])$/);
  if (arbitrary) {
    const inner = arbitrary[2].slice(1, -1);
    const opacity = parseArbitraryOpacityInner(inner);
    if (opacity != null) {
      return { base: arbitrary[1], opacity };
    }
    return { base: tail };
  }

  const integer = tail.match(/^(.+)\/(\d{1,3})$/);
  if (integer) {
    const pct = parseInt(integer[2], 10);
    if (pct >= 0 && pct <= 100) {
      return { base: integer[1], opacity: pct / 100 };
    }
  }

  return { base: tail };
};

/**
 * Append Tailwind v4 opacity modifier (arbitrary) for storage, e.g. "/[50%]"
 */
export const formatTailwindOpacityModifier = (alpha: number): string => {
  if (alpha >= 1 - 1e-6) return "";
  if (alpha <= 0) return "/[0%]";
  const pct = Math.round(alpha * 100);
  return `/[${pct}%]`;
};

/**
 * Parse a color value and prefix into background and clean value
 * Returns [bg, cleanValue] tuple
 */
export const parseColorValue = (value: string, prefix: string): [string, string] => {
  const val = extractValueAfterPrefix(value, prefix);
  let bg = val;

  // Wrap in brackets if needed
  bg = wrapInBrackets(val);

  // Extract clean value (remove brackets)
  const cleanValue = removeBrackets(bg);

  return [bg, cleanValue];
};

/**
 * Convert palette name to CSS variable format
 * e.g., "Primary Text" → "primary-text"
 */
export const paletteNameToVarName = (paletteName: string): string => {
  return paletteName
    .replace(/([A-Z])/g, "-$1")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/^-/, "")
    .replace(/--+/g, "-"); // Normalize multiple consecutive dashes to single dash
};

/**
 * Convert CSS variable name back to palette name
 * e.g., "primary-text" → "Primary Text"
 */
export const varNameToPaletteName = (varName: string): string => {
  return varName
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Convert a palette display name to its CSS var name
 * e.g., "Primary Content" → "primary-content"
 * e.g., "Base 100" → "base-100"
 */
export const paletteNameToShadcnVar = (paletteName: string): string => {
  return paletteNameToVarName(paletteName);
};

/**
 * Resolve palette references to CSS variable format
 * Handles backward compatibility for old "palette:" format
 */
export const resolvePaletteReference = (value: string, prefix: string = ""): string => {
  if (!value || !value.includes("palette:")) {
    return value;
  }

  const match = value.match(/palette:(.+)$/);
  if (!match) return value;

  const paletteName = match[1];
  const varName = paletteNameToShadcnVar(paletteName);

  // Extract prefix if present (e.g., "text-palette:Primary" → "text-")
  const currentPrefix = value.split("-palette:")[0];
  const usePrefix = currentPrefix && currentPrefix !== value ? currentPrefix : prefix;

  return usePrefix ? `${usePrefix}-[var(--${varName})]` : `var(--${varName})`;
};

/**
 * Resolve CSS variable to actual value from design system
 * e.g., "font-(--ph-heading-font-family)" → "Inter"
 * e.g., "var(--ph-heading-font-family)" → "Inter"
 */
export const resolveCSSVariable = (value: string, query: any = null): string => {
  if (!value || typeof value !== "string") {
    return value;
  }

  const fontTok = value.match(/^font-\((--[^)]+)\)$/);
  if (fontTok) {
    value = `var(${fontTok[1]})`;
  }

  // Extract CSS variable name from patterns like:
  // - "font-heading"
  // - "var(--heading-font-family)"
  // - legacy: "var(--ph-heading-font-family)"
  const varMatch = value.match(/var\((--(?:ph-)?[^)]+)\)/);
  if (!varMatch) {
    return value;
  }

  const cssVarName = varMatch[1]; // e.g., "--heading-font-family" or "--ph-heading-font-family"
  // Normalize: strip --ph- or -- prefix to get the kebab property name
  const rawName = cssVarName.replace(/^--(?:ph-)?/, "");

  try {
    // If query is not provided, try to get it from the editor context
    let actualQuery = query;
    if (!actualQuery && typeof window !== "undefined" && (window as any).__CRAFT_EDITOR__) {
      actualQuery = (window as any).__CRAFT_EDITOR__.query;
    }

    // Try to resolve from query (runtime design system)
    if (actualQuery) {
      const root = actualQuery.node(ROOT_NODE).get();

      if (root && root.data.props) {
        // Check style guide
        const theme = resolveTheme(root.data.props);
        if (theme.styleGuide) {
          const styleGuide = theme.styleGuide;
          // Convert CSS var name to camelCase property name
          // heading-font-family → headingFontFamily
          const propName = rawName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

          if (styleGuide[propName]) {
            return styleGuide[propName];
          }
        }

        // Check typography
        if (theme.typography && Array.isArray(theme.typography)) {
          for (const font of theme.typography) {
            if (font && font.name) {
              // Convert font name to CSS var name
              const fontVarName = font.name
                .replace(/([A-Z])/g, "-$1")
                .replace(/\s+/g, "-")
                .toLowerCase()
                .replace(/^-/, "");

              if (rawName.startsWith(fontVarName)) {
                if (rawName.includes("-font-family")) {
                  return font.fontFamily || "Inter";
                }
                if (rawName.includes("-font-size")) {
                  return font.fontSize || "1rem";
                }
                if (rawName.includes("-font-weight")) {
                  return font.fontWeight || "400";
                }
              }
            }
          }
        }
      }
    }
  } catch (e) {
    // Silent fail - proceed to fallback
  }

  // Fallback to DEFAULT values (always available — no dynamic require for browser bundles)
  const propName = rawName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

  if (DEFAULT_STYLE_GUIDE[propName] != null && DEFAULT_STYLE_GUIDE[propName] !== "") {
    return DEFAULT_STYLE_GUIDE[propName];
  }

  // Return original if we can't resolve
  return value;
};

/**
 * Get the actual color value from a Tailwind color class
 * e.g., "blue-500" → "#3b82f6"
 */
export const getTailwindColorHex = (colorName: string, shade?: string): string => {
  const colorKey = colorName.toLowerCase();
  const colorObj = colors[colorKey];

  if (!colorObj) {
    console.warn(`Color ${colorKey} not found`);
    return "#e5e7eb"; // Default gray
  }

  if (typeof colorObj === "string") {
    // For colors like "white" or "black" that are just strings
    return colorObj;
  }

  if (shade && typeof colorObj === "object" && colorObj[shade]) {
    return colorObj[shade];
  }

  console.warn(`Shade ${shade} not found for ${colorKey}`);
  return "#e5e7eb";
};

/**
 * Resolve opaque color from utility tail (no /opacity suffix — use splitOpacitySuffix first).
 */
function resolveColorForDisplayCore(
  bg: string,
  palette: PaletteColor[]
): { backgroundColor: string } {
  // Handle CSS variables (e.g., "var(--primary)" or legacy "var(--ph-primary)")
  if (bg.includes("var(--")) {
    const varMatch = bg.match(/var\(--((?:ph-)?[^)]+)\)/);
    if (varMatch) {
      const rawVar = varMatch[1].replace(/^ph-/, "");
      const paletteName = varNameToPaletteName(rawVar);

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

/**
 * Format a color value from the picker to storage format
 */
export const formatColorForStorage = (
  data: { type: ColorType; value: any },
  prefix: string = ""
): string => {
  if (!data || !data.value) return "";

  let val = data.value;

  if (data.type === "palette") {
    // Convert palette reference to CSS variable format
    const paletteName = data.value.replace("palette:", "");
    const varName = paletteNameToShadcnVar(paletteName);
    val = prefix ? `${prefix}-[var(--${varName})]` : `var(--${varName})`;
  } else if (data.type === "hex") {
    val = prefix ? `${prefix}-[${val}]` : val;
  } else if (data.type === "rgb") {
    // Handle RGB object from color picker — Tailwind v4: opaque rgb + /[pct%] when alpha < 1
    if (typeof val === "object" && val.r !== undefined) {
      const r = val.r;
      const g = val.g;
      const b = val.b;
      const a = val.a != null ? val.a : 1;
      if (prefix && a < 1 - 1e-6) {
        val = `${prefix}-[rgb(${r},${g},${b})]${formatTailwindOpacityModifier(a)}`;
      } else {
        val = `rgba(${r},${g},${b},${a})`;
        val = prefix ? `${prefix}-[${val}]` : val;
      }
    } else {
      val = prefix ? `${prefix}-[${val}]` : val;
    }
  } else {
    // Tailwind class
    val = prefix ? `${prefix}-${val}` : val;
  }

  return val;
};

/**
 * Check if a color value is a palette reference
 */
export const isPaletteColor = (value: string): boolean => {
  return Boolean(value && (value.includes("palette:") || value.includes("var(--")));
};

/**
 * Check if a color value is a hex color
 */
export const isHexColor = (value: string): boolean => {
  return Boolean(value && value.includes("#"));
};

/**
 * Check if a color value is a Tailwind class
 */
export const isTailwindClass = (value: string): boolean => {
  if (!value) return false;
  if (isPaletteColor(value) || isHexColor(value)) return false;

  const parts = value.split("-");
  return parts.length >= 2 && Boolean(colors[parts[0]]);
};

/**
 * Strip Tailwind prefixes from a color value
 * e.g., "bg-blue-500" → "blue-500"
 */
export const stripTailwindPrefix = (value: string): string => {
  if (!value) return value;

  const prefixesToStrip = [
    "bg-",
    "text-",
    "border-",
    "ring-offset-",
    "ring-",
    "outline-",
    "from-",
    "to-",
    "via-",
  ];

  for (const prefix of prefixesToStrip) {
    if (value.startsWith(prefix)) {
      return value.substring(prefix.length);
    }
  }

  return value;
};

/**
 * Convert hex to RGBA string
 */
export const hexToRGBA = (hex: string, alpha: number = 1): string => {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

/**
 * Apply opacity multiplier to a resolved CSS color string (hex, rgb/rgba, oklch).
 */
export const applyOpacityToCssColor = (resolved: string, opacityMod: number): string => {
  const t = resolved.trim();
  if (opacityMod >= 1 - 1e-6) return t;
  if (t === "transparent") return "rgba(0,0,0,0)";

  if (t.startsWith("#")) {
    const hex7 = t.slice(0, 7);
    if (/^#[0-9A-Fa-f]{6}$/i.test(hex7)) {
      return hexToRGBA(hex7, opacityMod);
    }
    const raw = t.replace("#", "");
    if (raw.length === 3) {
      const exp = raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
      return hexToRGBA(`#${exp}`, opacityMod);
    }
    if (raw.length === 8 && /^[0-9A-Fa-f]{8}$/i.test(raw)) {
      const existing = parseInt(raw.slice(6, 8), 16) / 255;
      return hexToRGBA(`#${raw.slice(0, 6)}`, existing * opacityMod);
    }
    return t;
  }

  const rgbaM = t.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i
  );
  if (rgbaM) {
    const r = Math.round(parseFloat(rgbaM[1]));
    const g = Math.round(parseFloat(rgbaM[2]));
    const b = Math.round(parseFloat(rgbaM[3]));
    const a = rgbaM[4] != null ? parseFloat(rgbaM[4]) : 1;
    return `rgba(${r},${g},${b},${a * opacityMod})`;
  }

  if (t.startsWith("oklch(")) {
    try {
      return hexToRGBA(oklchToHex(t), opacityMod);
    } catch {
      return t;
    }
  }

  return t;
};

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

  // Handle CSS variable format (e.g., "var(--primary)" or legacy "var(--ph-primary)")
  if (opaqueValue.includes("var(--")) {
    const match = opaqueValue.match(/var\(--((?:ph-)?[^)]+)\)/);
    if (match) {
      const rawVar = match[1].replace(/^ph-/, "");
      const paletteName = varNameToPaletteName(rawVar);
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

/** Checkerboard behind transparent / “no color” swatches (TokenPicker, toolbar ColorInput). */
export const TRANSPARENT_CHECKER_BG: CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, var(--color-base-300, #d4d4d8) 25%, transparent 25%, transparent 75%, var(--color-base-300, #d4d4d8) 75%), linear-gradient(45deg, var(--color-base-300, #d4d4d8) 25%, transparent 25%, transparent 75%, var(--color-base-300, #d4d4d8) 75%)",
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 4px 4px",
};

/** True when a resolved CSS color string should show the checkerboard underlay (transparent or alpha under 1). */
export function cssColorShowsTransparency(css: string): boolean {
  const t = css.trim().toLowerCase();
  if (t === "transparent") return true;
  const rgba = t.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/i);
  if (rgba && parseFloat(rgba[4]) < 1 - 1e-5) return true;
  return false;
}
