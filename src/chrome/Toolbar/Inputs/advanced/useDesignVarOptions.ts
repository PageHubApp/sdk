import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { useMemo } from "react";
import { resolveColorForDisplay } from "utils/design/colorSystem";
import { DEFAULT_PALETTE, DEFAULT_STYLE_GUIDE } from "utils/defaults";
import {
  FONT_WEIGHT_MAP,
  STYLE_VAR_MAP,
  PREFIX_CATEGORIES,
  ALL_CATEGORIES,
} from "./designVarConstants";

export interface DesignVar {
  name: string;
  varName: string; // --primary
  value: string; // The actual value
  category: "palette" | "typography" | "spacing" | "colors" | "other";
  label: string; // Display name
}

/** Convert a camelCase/PascalCase name to a CSS var name (without --) */
function toCssVarSegment(name: string): string {
  return name
    .replace(/([A-Z])/g, "-$1")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/^-/, "");
}

/** Use the centralized color system utility */
function resolveColor(color: string): string {
  const resolved = resolveColorForDisplay(color, "");
  return resolved.backgroundColor || color;
}

/**
 * Reads the design system (palette, typography, style guide) from the editor
 * root node, computes all available design variables, and filters/groups them
 * by the given CSS prefix and search term.
 */
export function useDesignVarOptions(prefix: string, searchTerm: string) {
  const designVarsResult = useEditor(state => {
    const rootNode = state.nodes[ROOT_NODE];
    const runtimePalette = rootNode?.data?.props?.pallet || [];
    const runtimeTypography = rootNode?.data?.props?.typography || [];
    const runtimeStyleGuide = rootNode?.data?.props?.styleGuide || {};

    const vars: DesignVar[] = [];

    // Palette colors
    const palette = runtimePalette.length > 0 ? runtimePalette : DEFAULT_PALETTE;
    palette.forEach((item: any) => {
      if (item?.name && item?.color) {
        const varName = toCssVarSegment(item.name);
        vars.push({
          name: item.name,
          varName: `--${varName}`,
          value: resolveColor(item.color),
          category: "palette",
          label: `${item.name} (Palette)`,
        });
      }
    });

    // Typography fonts
    runtimeTypography.forEach((font: any) => {
      if (!font?.name) return;
      const varName = toCssVarSegment(font.name);

      vars.push({
        name: `${font.name} Font Family`,
        varName: `--${varName}-font-family`,
        value: font.fontFamily || "Inter",
        category: "typography",
        label: `${font.name} Font Family`,
      });

      vars.push({
        name: `${font.name} Font Size`,
        varName: `--${varName}-font-size`,
        value: font.fontSize || "1rem",
        category: "typography",
        label: `${font.name} Font Size`,
      });

      let fontWeightValue = font.fontWeight || "font-normal";
      if (FONT_WEIGHT_MAP[fontWeightValue]) {
        fontWeightValue = FONT_WEIGHT_MAP[fontWeightValue];
      }
      vars.push({
        name: `${font.name} Font Weight`,
        varName: `--${varName}-font-weight`,
        value: fontWeightValue,
        category: "typography",
        label: `${font.name} Font Weight`,
      });

      vars.push({
        name: `${font.name} Line Height`,
        varName: `--${varName}-line-height`,
        value: font.lineHeight || "1.5",
        category: "typography",
        label: `${font.name} Line Height`,
      });

      vars.push({
        name: `${font.name} Letter Spacing`,
        varName: `--${varName}-letter-spacing`,
        value: font.letterSpacing || "normal",
        category: "typography",
        label: `${font.name} Letter Spacing`,
      });

      vars.push({
        name: `${font.name} Text Transform`,
        varName: `--${varName}-text-transform`,
        value: font.textTransform || "none",
        category: "typography",
        label: `${font.name} Text Transform`,
      });
    });

    // Style guide variables
    const styleGuide = { ...DEFAULT_STYLE_GUIDE, ...runtimeStyleGuide };
    Object.entries(styleGuide).forEach(([key, value]) => {
      if (value && STYLE_VAR_MAP[key]) {
        vars.push({
          name: key,
          varName: `--${toCssVarSegment(key)}`,
          value: String(value),
          category: STYLE_VAR_MAP[key].category as DesignVar["category"],
          label: STYLE_VAR_MAP[key].label,
        });
      }
    });

    return vars;
  });

  // useEditor can return an object with numeric keys instead of an array
  let designVars: DesignVar[] = [];
  if (Array.isArray(designVarsResult)) {
    designVars = designVarsResult;
  } else if (designVarsResult && typeof designVarsResult === "object") {
    designVars = Object.keys(designVarsResult)
      .filter(key => !isNaN(Number(key)))
      .map(key => (designVarsResult as any)[key])
      .filter((item): item is DesignVar => item && typeof item === "object" && "varName" in item);
  }

  // Filter by prefix category and search term
  const relevantCategories = PREFIX_CATEGORIES[prefix] || ALL_CATEGORIES;
  const filteredVars = useMemo(
    () =>
      designVars.filter(
        v =>
          relevantCategories.includes(v.category) &&
          (v.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.varName.toLowerCase().includes(searchTerm.toLowerCase()))
      ),
    [designVars, relevantCategories, searchTerm]
  );

  // Group by category
  const groupedVars = useMemo(
    () =>
      filteredVars.reduce(
        (acc, v) => {
          if (!acc[v.category]) acc[v.category] = [];
          acc[v.category].push(v);
          return acc;
        },
        {} as Record<string, DesignVar[]>
      ),
    [filteredVars]
  );

  return { designVars, filteredVars, groupedVars };
}
