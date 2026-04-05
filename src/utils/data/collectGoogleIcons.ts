/**
 * Utility to collect all Google Material Symbols icons used in the Craft.js tree
 * and generate an optimized Google Fonts URL
 */

export interface SerializedNode {
  props?: Record<string, any>;
  nodes?: string[];
  linkedNodes?: Record<string, string>;
}

/**
 * Recursively extract Google icon names from a node's props
 */
function extractIconsFromProps(props: Record<string, any>): string[] {
  const icons: string[] = [];

  for (const value of Object.values(props)) {
    if (typeof value === "string" && value.startsWith("ref-google:")) {
      // Extract icon name: "ref-google:home" -> "home"
      icons.push(value.replace("ref-google:", ""));
    } else if (typeof value === "object" && value !== null) {
      // Check nested objects (like icon.value)
      icons.push(...extractIconsFromProps(value));
    } else if (Array.isArray(value)) {
      // Check arrays (like navItems)
      for (const item of value) {
        if (typeof item === "object" && item !== null) {
          icons.push(...extractIconsFromProps(item));
        }
      }
    }
  }

  return icons;
}

/**
 * Collect all unique Google icon names from serialized Craft.js nodes
 */
export function collectGoogleIcons(nodes: Record<string, SerializedNode>): string[] {
  const allIcons: string[] = [];

  for (const node of Object.values(nodes)) {
    if (node.props) {
      allIcons.push(...extractIconsFromProps(node.props));
    }
  }

  // Return unique, sorted icon names
  return [...new Set(allIcons)].sort();
}

/**
 * Generate optimized Google Fonts URL for Material Symbols
 * Based on: https://developers.google.com/fonts/docs/material_symbols
 *
 * @param iconNames - Array of icon names (e.g., ["home", "palette", "settings"])
 * @param axes - Font axes to include (default: FILL for transitions, weight 400)
 * @returns Optimized Google Fonts URL (or null if no icons)
 *
 * @example
 * // Loads only 3 icons with FILL axis: ~2-3 KB
 * const url = generateOptimizedMaterialSymbolsUrl(["home", "palette", "settings"]);
 * // https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL@0..1&icon_names=home,palette,settings&display=block
 */
export function generateOptimizedMaterialSymbolsUrl(
  iconNames: string[],
  axes: string = "FILL@0..1"
): string | null {
  if (iconNames.length === 0) return null;

  const sortedIcons = [...new Set(iconNames)].sort().join(",");

  return `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:${axes}&icon_names=${sortedIcons}&display=block`;
}

/**
 * Get Material Symbols URL from Craft.js serialized nodes
 */
export function getMaterialSymbolsUrlFromNodes(
  nodes: Record<string, SerializedNode>
): string | null {
  const icons = collectGoogleIcons(nodes);
  return generateOptimizedMaterialSymbolsUrl(icons);
}
