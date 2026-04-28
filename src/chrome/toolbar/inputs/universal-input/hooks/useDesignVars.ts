import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { resolveColorForDisplay } from "@/utils/design/colorSystem";
import { DEFAULT_PALETTE, DEFAULT_STYLE_GUIDE } from "@/utils/defaults";
import { resolveTheme } from "@/utils/design/resolveTheme";
import {
  NON_TOKEN_STYLE_KEYS,
  STYLE_TOKEN_REGISTRY,
  StyleTokenCategory,
  inferCategory,
  inferTokenType,
  styleKeyToVarName,
} from "../styleTokenRegistry";
import { DesignVar } from "../types";

const FONT_WEIGHT_NUMERIC_TO_CLASS: Record<string, string> = {
  "100": "font-thin",
  "200": "font-extralight",
  "300": "font-light",
  "400": "font-normal",
  "500": "font-medium",
  "600": "font-semibold",
  "700": "font-bold",
  "800": "font-extrabold",
  "900": "font-black",
};

function paletteVarSlug(name: string): string {
  return name
    .replace(/([A-Z])/g, "-$1")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/^-/, "");
}

export function useDesignVars(): DesignVar[] {
  const designVars = useEditor(state => {
    const rootNode = state.nodes[ROOT_NODE];
    const theme = resolveTheme(rootNode?.data?.props || {});
    const runtimePalette = theme.palette;
    const runtimeTypography = theme.typography || [];
    const runtimeStyleGuide = theme.styleGuide;
    // Optional sidecar metadata for styleGuide tokens (custom flag, applies-to
    // override). Sparse — most tokens don't have an entry.
    const styleGuideMeta: Record<
      string,
      { appliesTo?: StyleTokenCategory[]; custom?: boolean }
    > = (theme as any).styleGuideMeta || {};

    const vars: DesignVar[] = [];

    // ── Palette colors ────────────────────────────────────────────────
    const palette = runtimePalette.length > 0 ? runtimePalette : DEFAULT_PALETTE;
    palette.forEach((item: any) => {
      if (item?.name && item?.color) {
        const slug = paletteVarSlug(item.name);
        vars.push({
          name: item.name,
          varName: `--${slug}`,
          value: resolveColorForDisplay(item.color, "").backgroundColor || item.color,
          category: "palette",
          label: `${item.name} (Palette)`,
          key: item.name,
          source: "palette",
        });
      }
    });

    // ── Typography presets (per-font derived vars) ────────────────────
    runtimeTypography.forEach((font: any) => {
      if (!font?.name) return;
      const slug = paletteVarSlug(font.name);

      vars.push({
        name: `${font.name} Font Family`,
        varName: `--${slug}-font-family`,
        value: font.fontFamily || "Inter",
        category: "typography",
        label: `${font.name} Font Family`,
        key: font.name,
        source: "typography",
      });

      vars.push({
        name: `${font.name} Font Size`,
        varName: `--${slug}-font-size`,
        value: font.fontSize || "1rem",
        category: "typography",
        label: `${font.name} Font Size`,
        key: font.name,
        source: "typography",
      });

      let fontWeightValue = font.fontWeight || "font-normal";
      if (FONT_WEIGHT_NUMERIC_TO_CLASS[fontWeightValue]) {
        fontWeightValue = FONT_WEIGHT_NUMERIC_TO_CLASS[fontWeightValue];
      }
      vars.push({
        name: `${font.name} Font Weight`,
        varName: `--${slug}-font-weight`,
        value: fontWeightValue,
        category: "typography",
        label: `${font.name} Font Weight`,
        key: font.name,
        source: "typography",
      });

      vars.push({
        name: `${font.name} Line Height`,
        varName: `--${slug}-line-height`,
        value: font.lineHeight || "1.5",
        category: "typography",
        label: `${font.name} Line Height`,
        key: font.name,
        source: "typography",
      });

      vars.push({
        name: `${font.name} Letter Spacing`,
        varName: `--${slug}-letter-spacing`,
        value: font.letterSpacing || "normal",
        category: "typography",
        label: `${font.name} Letter Spacing`,
        key: font.name,
        source: "typography",
      });

      vars.push({
        name: `${font.name} Text Transform`,
        varName: `--${slug}-text-transform`,
        value: font.textTransform || "none",
        category: "typography",
        label: `${font.name} Text Transform`,
        key: font.name,
        source: "typography",
      });
    });

    // ── StyleGuide tokens ─────────────────────────────────────────────
    // Built-ins come from the registry; unknown keys are user-created.
    const styleGuide = { ...DEFAULT_STYLE_GUIDE, ...runtimeStyleGuide };

    Object.entries(styleGuide).forEach(([key, value]) => {
      if (value == null || value === "") return;
      if (NON_TOKEN_STYLE_KEYS.has(key)) return;

      const registry = STYLE_TOKEN_REGISTRY[key];
      const meta = styleGuideMeta[key];
      const isCustom = !registry || meta?.custom === true;

      if (registry) {
        // Built-in: use registry metadata. Label includes a "(Token)" hint
        // for non-palette/typography categories so users can tell built-in
        // styleGuide entries apart from palette swatches in the picker.
        vars.push({
          name: key,
          varName: styleKeyToVarName(key),
          value: String(value),
          category: registry.category,
          label: registry.label,
          custom: meta?.custom === true,
          key,
          source: "styleGuide",
        });
      } else {
        // Custom: derive type from value + category from meta.appliesTo (or
        // heuristic). Label is humanized from the key.
        const inferredType = inferTokenType(String(value));
        const category = meta?.appliesTo?.[0] ?? inferCategory(inferredType);
        const label = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, c => c.toUpperCase())
          .trim();
        vars.push({
          name: key,
          varName: styleKeyToVarName(key),
          value: String(value),
          category,
          label: `${label} (Custom)`,
          custom: true,
          key,
          source: "styleGuide",
        });
      }
    });

    return vars;
  });

  if (Array.isArray(designVars)) return designVars;

  if (designVars && typeof designVars === "object") {
    return Object.keys(designVars as any)
      .filter(key => !isNaN(Number(key)))
      .map(key => (designVars as any)[key])
      .filter(item => item && typeof item === "object" && "varName" in item);
  }

  return [];
}
