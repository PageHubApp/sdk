import colors from "tailwindcss/colors";
import { sdkLog } from "../../logger";

/**
 * Get the actual color value from a Tailwind color class
 * e.g., "blue-500" → "#3b82f6"
 *
 * Only file in the color module that imports `tailwindcss/colors` for the hex
 * lookup table — keeps the hefty import out of importers that only parse strings.
 */
export const getTailwindColorHex = (colorName: string, shade?: string): string => {
  const colorKey = colorName.toLowerCase();
  const colorObj = colors[colorKey];

  if (!colorObj) {
    sdkLog.warn(`Color ${colorKey} not found`);
    return "#e5e7eb"; // Default gray
  }

  if (typeof colorObj === "string") {
    // For colors like "white" or "black" that are just strings
    return colorObj;
  }

  if (shade && typeof colorObj === "object" && colorObj[shade]) {
    return colorObj[shade];
  }

  sdkLog.warn(`Shade ${shade} not found for ${colorKey}`);
  return "#e5e7eb";
};
