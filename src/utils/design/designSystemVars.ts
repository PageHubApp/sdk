// Utility functions for managing design system CSS variables

import { NamedColor } from "../../components/Background";
import { DEFAULT_STYLE_GUIDE } from "../defaults";
import { autoGenerateContentColors, colorToOklch } from "./contentColor";
import { generateCSSAliases } from "./tokenMigration";

export interface DesignSystemVars {
  palette: NamedColor[];
  darkPalette?: NamedColor[];
  darkModeEnabled?: boolean;
  styleGuide: Record<string, any>;
  typography?: any[];
}

/**
 * Style guide key → CSS variable name overrides.
 * Keys not listed here use the default toCSSVarName() conversion with no prefix.
 */
const STYLE_VAR_OVERRIDES: Record<string, string> = {
  radiusBox: "radius-box",
  radiusField: "radius-field",
  radiusSelector: "radius-selector",
  sizeField: "size-field",
  sizeSelector: "size-selector",
  spaceXs: "space-xs",
  spaceSm: "space-sm",
  spaceMd: "space-md",
  spaceLg: "space-lg",
  spaceXl: "space-xl",
  spacingDensity: "spacing-density",
};

/** Keys whose CSS output should be wrapped in calc(<value> * var(--spacing-density)) */
const DENSITY_SCALED_KEYS = new Set(["spaceXs", "spaceSm", "spaceMd", "spaceLg", "spaceXl"]);

/** Map human-readable spacing density names to numeric multipliers.
 *  CSS calc() requires a number — `calc(2.5rem * comfortable)` is invalid and resolves to 0. */
const SPACING_DENSITY_NAMES: Record<string, string> = {
  minimal: "0.75",
  tight: "0.75",
  compact: "0.85",
  default: "1",
  normal: "1",
  comfortable: "1.125",
  generous: "1.25",
  spacious: "1.5",
  ultra: "2.5",
};

/**
 * Convert a name to a valid CSS variable name
 * "Primary Text" -> "primary-text"
 * "inputBorder" -> "input-border"
 */
export function toCSSVarName(name: string): string {
  // Guard against undefined/null
  if (!name || typeof name !== "string") {
    console.warn("toCSSVarName received invalid name:", name);
    return "";
  }

  return name
    .replace(/([A-Z])/g, "-$1") // Add hyphen before capitals
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .toLowerCase()
    .replace(/^-/, "") // Remove leading hyphen
    .replace(/--+/g, "-"); // Normalize multiple consecutive dashes to single dash
}

/**
 * Convert palette name to CSS variable name (no prefix)
 * "Primary" -> "--primary"
 * "Primary Content" -> "--primary-content"
 * "Card" -> "--card"
 */
export function toPaletteCSSVarName(name: string): string {
  return `--${toCSSVarName(name)}`;
}

/**
 * Convert style guide key to CSS variable name (no prefix)
 * "radiusBox" -> "--radius-box"
 * "inputBorder" -> "--input-border"
 */
export function toStyleCSSVarName(key: string): string {
  if (STYLE_VAR_OVERRIDES[key]) {
    return `--${STYLE_VAR_OVERRIDES[key]}`;
  }
  return `--${toCSSVarName(key)}`;
}

/**
 * Convert Tailwind color to actual CSS color value
 * "blue-500" -> actual hex color from Tailwind
 * "#ff0000" -> "#ff0000"
 * "white" -> "#ffffff"
 */
function resolveTailwindColor(color: string): string {
  // If it's already a hex, rgba, or rgb value, return as-is
  if (color.startsWith("#") || color.startsWith("rgba") || color.startsWith("rgb")) {
    return color;
  }

  // Handle special named colors
  const specialColors: Record<string, string> = {
    white: "#ffffff",
    black: "#000000",
    transparent: "transparent",
    current: "currentColor",
  };

  if (specialColors[color]) {
    return specialColors[color];
  }

  // For Tailwind color classes like "blue-500" or "gray-900",
  // we need to import the actual color values
  try {
    const colors = require("tailwindcss/colors");

    // Parse "blue-500" -> colors.blue[500]
    const parts = color.split("-");
    if (parts.length === 2) {
      const [colorName, shade] = parts;
      if (colors[colorName] && typeof colors[colorName] === "object" && colors[colorName][shade]) {
        return colors[colorName][shade];
      }
    }
  } catch (e) {
    // If we can't resolve it, return as-is
  }

  // Fallback: return the value as-is
  return color;
}

/** Quote a single font-family name when it has spaces (e.g. Noto Sans). Leave stacks (commas) untouched. */
function quoteCssFontFamilyValue(value: string): string {
  const t = (value || "").trim();
  if (!t) return t;
  if (t.startsWith("var(")) return t;
  if (t.includes(",")) return t;
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t;
  }
  if (/\s/.test(t)) return JSON.stringify(t);
  return t;
}

/**
 * Generates CSS custom properties for palette colors
 * palette:Primary -> --primary
 * palette:Primary Content -> --primary-content
 */
export function generatePaletteCSSVariables(palette: NamedColor[]): string {
  const variables: string[] = [];

  if (!palette || !Array.isArray(palette)) {
    console.warn("generatePaletteCSSVariables received invalid palette:", palette);
    return "";
  }

  palette.forEach((item, i) => {
    // Normalize legacy raw string values (e.g. "rgba(250,250,249,1)" or "stone-50")
    if (typeof item === "string") {
      item = { name: `color-${i + 1}`, color: item };
    }
    if (!item || !item.name || !item.color) {
      return;
    }

    const cssVar = toPaletteCSSVarName(item.name);
    if (!cssVar || cssVar === "--") return;

    // Palette colors are stored as oklch() natively — pass through.
    // Legacy hex/rgba values are handled by colorToOklch as a fallback.
    const colorValue = item.color.startsWith("oklch(")
      ? item.color
      : colorToOklch(resolveTailwindColor(item.color));
    variables.push(`  ${cssVar}: ${colorValue};`);
    // Also emit --color-* alias for DaisyUI 5 component CSS compatibility.
    // DaisyUI resolves var(--color-primary) at :root; overriding --primary on a
    // descendant scope doesn't update it. Direct --color-* vars fix the cascade.
    const colorAlias = cssVar.replace(/^--(?!color-)/, "--color-");
    if (colorAlias !== cssVar) variables.push(`  ${colorAlias}: ${colorValue};`);
  });

  return variables.join("\n");
}

/**
 * Generates CSS custom properties for style guide values
 * Creates CSS variables for actual CSS values (colors, sizes, measurements)
 * NOT for Tailwind utility classes like "rounded-lg" or "px-6 py-3"
 */
export function generateStyleGuideCSSVariables(styleGuide: Record<string, any>): string {
  const variables: string[] = [];

  if (!styleGuide || typeof styleGuide !== "object") {
    console.warn("generateStyleGuideCSSVariables received invalid styleGuide:", styleGuide);
    return "";
  }

  // Create CSS variables for actual CSS values
  // These are values that can be used with Tailwind arbitrary syntax
  const cssVarKeys = [
    // Colors
    "inputBorderColor",
    "inputBgColor",
    "inputTextColor",
    "inputPlaceholderColor",
    "inputFocusRingColor",
    "linkColor",
    "linkHoverColor",
    // Sizes & measurements (actual CSS values, not Tailwind classes)
    "border",
    "inputPadding",
    "inputFocusRing",
    // Radius & sizing (DaisyUI 5)
    "radiusBox",
    "radiusField",
    "radiusSelector",
    "sizeField",
    "sizeSelector",
    "depth",
    "noise",
    // Layout & spacing
    "buttonPadding",
    "containerPadding",
    "sectionGap",
    "containerGap",
    "contentWidth",
    "shadowStyle",
    // Spatial scale
    "spaceXs",
    "spaceSm",
    "spaceMd",
    "spaceLg",
    "spaceXl",
    "spacingDensity",
    // Typography - font weights (Tailwind classes)
    "headingFont",
    "bodyFont",
    // Typography - font families (actual font names for CSS variables)
    "headingFontFamily",
    "bodyFontFamily",
    "accentFontFamily",
  ];

  Object.entries(styleGuide).forEach(([key, value]) => {
    if (
      value &&
      typeof value === "string" &&
      (cssVarKeys.includes(key) || key.endsWith("FontFamily"))
    ) {
      const cssVar = toStyleCSSVarName(key);
      if (!cssVar || cssVar === "--") return;

      // If the value references a palette, we need to resolve it
      let resolvedValue = value;
      if (value.startsWith("palette:")) {
        const paletteName = value.replace("palette:", "").trim();
        if (!paletteName) return;

        resolvedValue = `var(${toPaletteCSSVarName(paletteName)})`;
      } else {
        // For non-palette values, resolve Tailwind colors to actual hex values
        resolvedValue = resolveTailwindColor(value);
      }

      // Normalize spacingDensity: convert word names to numeric multipliers
      if (key === "spacingDensity") {
        const lower = resolvedValue.toLowerCase().trim();
        if (SPACING_DENSITY_NAMES[lower]) {
          resolvedValue = SPACING_DENSITY_NAMES[lower];
        } else if (isNaN(Number(resolvedValue))) {
          // Not a recognized name and not a number — fall back to 1
          resolvedValue = "1";
        }
      }

      if (key.endsWith("FontFamily")) {
        resolvedValue = quoteCssFontFamilyValue(resolvedValue);
      }

      // Special handling for padding values that need to be split into x and y
      if (key === "containerPadding" || key === "buttonPadding" || key === "inputPadding") {
        const varName = toCSSVarName(key);
        const parts = resolvedValue.split(" ");
        if (parts.length === 2) {
          variables.push(`  --${varName}: ${resolvedValue};`);
          // CSS shorthand is "Y X" (vertical first, horizontal second)
          variables.push(`  --${varName}-y: ${parts[0]};`);
          variables.push(`  --${varName}-x: ${parts[1]};`);
        } else {
          variables.push(`  --${varName}: ${resolvedValue};`);
          variables.push(`  --${varName}-x: ${resolvedValue};`);
          variables.push(`  --${varName}-y: ${resolvedValue};`);
        }
      } else if (DENSITY_SCALED_KEYS.has(key)) {
        // Spatial scale tokens: wrap in calc() with density multiplier
        variables.push(`  ${cssVar}: calc(${resolvedValue} * var(--spacing-density));`);
      } else {
        variables.push(`  ${cssVar}: ${resolvedValue};`);
      }
    }
  });

  return variables.join("\n");
}

/**
 * Generates CSS classes for typography presets
 */
export function generateTypographyCSSClasses(typography: any[]): string {
  if (!typography || !Array.isArray(typography) || typography.length === 0) {
    return "";
  }

  const classes: string[] = [];

  typography.forEach(font => {
    if (!font || !font.name) return;

    const className = `ph-${toCSSVarName(font.name)}`;
    const varName = toCSSVarName(font.name);

    // Generate CSS class that uses CSS variables
    classes.push(`
.${className} {
  font-family: var(--${varName}-font-family, ${font.fontFamily || "inherit"});
  font-size: var(--${varName}-font-size, ${font.fontSize || "1rem"});
  font-weight: var(--${varName}-font-weight, ${font.fontWeight || "400"});
  line-height: var(--${varName}-line-height, ${font.lineHeight || "1.5"});
  letter-spacing: var(--${varName}-letter-spacing, ${font.letterSpacing || "normal"});
  text-transform: var(--${varName}-text-transform, ${font.textTransform || "none"});
}`);
  });

  return classes.join("\n");
}

/**
 * Generates CSS variables for typography presets
 */
export function generateTypographyCSSVariables(typography: any[]): string {
  if (!typography || !Array.isArray(typography) || typography.length === 0) {
    return "";
  }

  const variables: string[] = [];

  typography.forEach(font => {
    if (!font || !font.name) return;

    const varName = toCSSVarName(font.name);

    if (font.fontFamily) {
      variables.push(`  --${varName}-font-family: ${quoteCssFontFamilyValue(font.fontFamily)};`);
    }
    if (font.fontSize) {
      variables.push(`  --${varName}-font-size: ${font.fontSize};`);
    }
    if (font.fontWeight) {
      variables.push(`  --${varName}-font-weight: ${font.fontWeight};`);
    }
    if (font.lineHeight) {
      variables.push(`  --${varName}-line-height: ${font.lineHeight};`);
    }
    if (font.letterSpacing) {
      variables.push(`  --${varName}-letter-spacing: ${font.letterSpacing};`);
    }
    if (font.textTransform) {
      variables.push(`  --${varName}-text-transform: ${font.textTransform};`);
    }
  });

  return variables.join("\n");
}

/**
 * Generates all design system CSS variables and classes
 * @param scope - CSS selector to scope vars to. Default ":root" for published sites,
 *                use "#viewport" in the editor to avoid collision with editor chrome vars.
 */
export function generateDesignSystemCSSVariables(
  designSystem: DesignSystemVars,
  scope: string = ":root"
): string {
  // Auto-generate content colors from surface colors (DaisyUI 5-style oklch contrast)
  const palette = autoGenerateContentColors(designSystem.palette);
  const paletteVars = generatePaletteCSSVariables(palette);
  // Partial persisted styleGuide (e.g. only fonts) must not drop layout tokens like --radius-box.
  const mergedStyleGuide = {
    ...DEFAULT_STYLE_GUIDE,
    ...(designSystem.styleGuide && typeof designSystem.styleGuide === "object"
      ? designSystem.styleGuide
      : {}),
  };
  const styleVars = generateStyleGuideCSSVariables(mergedStyleGuide);
  const typographyVars = designSystem.typography
    ? generateTypographyCSSVariables(designSystem.typography)
    : "";
  const typographyClasses = designSystem.typography
    ? generateTypographyCSSClasses(designSystem.typography)
    : "";

  // Permanent backwards-compat aliases: old var names → new DaisyUI var names.
  // Ensures old className strings in published sites keep working.
  const aliases = generateCSSAliases();

  const cssVars = `${scope} {\n  color-scheme: light;\n${paletteVars}\n${aliases}\n${styleVars}\n${typographyVars}\n}`;

  // Dark mode palette: emit @media (prefers-color-scheme: dark) and .dark selector overrides
  let darkBlock = "";
  if (designSystem.darkPalette && designSystem.darkPalette.length > 0) {
    const darkPaletteVars = generatePaletteCSSVariables(
      autoGenerateContentColors(designSystem.darkPalette)
    );
    if (darkPaletteVars) {
      // For #viewport scope, only activate dark palette when viewport itself has .dark class
      // (the "Edit dark: variants" toggle), NOT when <html> has .dark (SDK chrome toggle).
      // For :root scope (published sites), use both prefers-color-scheme and .dark ancestor.
      if (scope === "#viewport") {
        darkBlock = `\n${scope}.dark {\n  color-scheme: dark;\n${darkPaletteVars}\n}`;
      } else {
        darkBlock =
          `\n@media (prefers-color-scheme: dark) {\n  ${scope} {\n  color-scheme: dark;\n${darkPaletteVars}\n  }\n}` +
          `\n.dark ${scope}, ${scope}.dark {\n  color-scheme: dark;\n${darkPaletteVars}\n}`;
      }
    }
  }

  const allCSS = darkBlock ? `${cssVars}${darkBlock}` : cssVars;

  return typographyClasses ? `${allCSS}\n${typographyClasses}` : allCSS;
}

/**
 * Injects design system CSS variables into the document.
 * Scoped to #viewport in the editor to avoid colliding with editor chrome vars.
 * Falls back to :root on view/published pages where #viewport doesn't exist.
 */
export function injectDesignSystemVars(designSystem: DesignSystemVars): void {
  if (typeof window === "undefined") return;

  const scope = document.getElementById("viewport") ? "#viewport" : ":root";
  const cssText = generateDesignSystemCSSVariables(designSystem, scope);

  // In-place update: never remove+add to avoid FOUC
  let el = document.getElementById("design-system-vars") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "design-system-vars";
    document.head.appendChild(el);
  }
  if (el.textContent !== cssText) {
    el.textContent = cssText;
  }
}
