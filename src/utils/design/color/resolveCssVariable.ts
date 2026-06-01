import { ROOT_NODE } from "../../../utils/rootNode";
import { DEFAULT_STYLE_GUIDE } from "../../defaults";
import { resolveTheme } from "../resolveTheme";

/**
 * Resolve CSS variable to actual value from design system
 * e.g., "font-(--ph-heading-font-family)" → "Inter"
 * e.g., "var(--ph-heading-font-family)" → "Inter"
 *
 * NOTE: reads `window.__CRAFT_EDITOR__` when no `query` is passed — editor-only
 * coupling. Safe under SSR (typeof window guard) but only useful on /build.
 * Keep this out of any path reachable by the SSR CSS pipeline / static walker.
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
  const varMatch = value.match(/var\((--[^)]+)\)/);
  if (!varMatch) {
    return value;
  }

  const cssVarName = varMatch[1]; // e.g., "--heading-font-family"
  const rawName = cssVarName.replace(/^--/, "");

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
