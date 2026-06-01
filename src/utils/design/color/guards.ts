import colors from "tailwindcss/colors";

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
