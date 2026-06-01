/**
 * Palette display-name ↔ CSS-var-name conversion + palette reference resolution.
 */

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
