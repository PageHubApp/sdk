// @ts-nocheck
import { ROOT_NODE } from "@craftjs/core";
import colors from "tailwindcss/colors";
import { DEFAULT_STYLE_GUIDE } from "../defaults";

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
 * e.g., "Primary Foreground" → "primary-foreground"
 * e.g., "Background" → "background"
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
  // - "font-(--heading-font-family)"
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
        if (root.data.props.styleGuide) {
          const styleGuide = root.data.props.styleGuide;
          // Convert CSS var name to camelCase property name
          // heading-font-family → headingFontFamily
          const propName = rawName
            .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

          if (styleGuide[propName]) {
            return styleGuide[propName];
          }
        }

        // Check typography
        if (root.data.props.typography && Array.isArray(root.data.props.typography)) {
          for (const font of root.data.props.typography) {
            if (font && font.name) {
              // Convert font name to CSS var name
              const fontVarName =
                font.name
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
  const propName = rawName
    .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

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
 * Resolve a color value to its actual CSS color for display
 * Handles CSS variables, palette colors, Tailwind classes, hex, rgba, etc.
 */
export const resolveColorForDisplay = (
  value: string,
  prefix: string,
  palette: PaletteColor[] = []
): { backgroundColor: string } => {
  const [bg] = parseColorValue(value, prefix);

  if (!bg) {
    return { backgroundColor: "var(--muted)" };
  }

  // Handle CSS variables (e.g., "var(--primary)" or legacy "var(--ph-primary)")
  if (bg.includes("var(--")) {
    const varMatch = bg.match(/var\(--((?:ph-)?[^)]+)\)/);
    if (varMatch) {
      const rawVar = varMatch[1].replace(/^ph-/, "");
      const paletteName = varNameToPaletteName(rawVar);

      const paletteColor = palette.find(p => p.name === paletteName);
      if (paletteColor) {
        return resolveColorForDisplay(paletteColor.color, "", palette);
      }
    }
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

  // Standard Tailwind colors (e.g., "blue-500")
  const parts = bg.split("-");
  if (parts.length === 2) {
    const [colorName, shade] = parts;
    const hex = getTailwindColorHex(colorName, shade);
    return { backgroundColor: hex };
  }

  // Fallback to gray
  return { backgroundColor: "#e5e7eb" };
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
    // Handle RGB object from color picker
    if (typeof val === "object" && val.r !== undefined) {
      val = `rgba(${val.r},${val.g},${val.b},${val.a})`;
    }
    val = prefix ? `${prefix}-[${val}]` : val;
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
  
  // Handle palette reference format
  if (valueString.includes("palette:")) {
    const match = valueString.match(/palette:(.+)$/);
    if (match) {
      const extractedName = match[1].trim();
      return extractedName === paletteColor.name.trim();
    }
  }

  // Handle CSS variable format (e.g., "var(--primary)" or legacy "var(--ph-primary)")
  if (valueString.includes("var(--")) {
    const match = valueString.match(/var\(--((?:ph-)?[^)]+)\)/);
    if (match) {
      const rawVar = match[1].replace(/^ph-/, "");
      const paletteName = varNameToPaletteName(rawVar);
      return paletteName === paletteColor.name.trim();
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
