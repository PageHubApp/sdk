import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { resolveColorForDisplay } from "@/utils/design/colorSystem";
import { DEFAULT_PALETTE, DEFAULT_STYLE_GUIDE } from "@/utils/defaults";
import { resolveTheme } from "@/utils/design/resolveTheme";
import { DesignVar } from "../types";

export function useDesignVars(): DesignVar[] {
  const designVars = useEditor(state => {
    const rootNode = state.nodes[ROOT_NODE];
    const theme = resolveTheme(rootNode?.data?.props || {});
    const runtimePalette = theme.palette;
    const runtimeTypography = theme.typography || [];
    const runtimeStyleGuide = theme.styleGuide;

    const vars: DesignVar[] = [];

    // Use runtime palette if available, otherwise use defaults
    const palette = runtimePalette.length > 0 ? runtimePalette : DEFAULT_PALETTE;

    // Palette colors
    palette.forEach((item: any) => {
      if (item?.name && item?.color) {
        const varName = item.name
          .replace(/([A-Z])/g, "-$1")
          .replace(/\s+/g, "-")
          .toLowerCase()
          .replace(/^-/, "");

        vars.push({
          name: item.name,
          varName: `--${varName}`,
          value: resolveColorForDisplay(item.color, "").backgroundColor || item.color,
          category: "palette",
          label: `${item.name} (Palette)`,
        });
      }
    });

    // Custom typography fonts
    runtimeTypography.forEach((font: any, index: number) => {
      if (font?.name) {
        const varName = font.name
          .replace(/([A-Z])/g, "-$1")
          .replace(/\s+/g, "-")
          .toLowerCase()
          .replace(/^-/, "");

        // Add font family variable
        vars.push({
          name: `${font.name} Font Family`,
          varName: `--${varName}-font-family`,
          value: font.fontFamily || "Inter",
          category: "typography",
          label: `${font.name} Font Family`,
        });

        // Add font size variable
        vars.push({
          name: `${font.name} Font Size`,
          varName: `--${varName}-font-size`,
          value: font.fontSize || "1rem",
          category: "typography",
          label: `${font.name} Font Size`,
        });

        // Add font weight variable - convert numeric weights to Tailwind classes
        let fontWeightValue = font.fontWeight || "font-normal";
        const fontWeightMap: Record<string, string> = {
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
        if (fontWeightMap[fontWeightValue]) {
          fontWeightValue = fontWeightMap[fontWeightValue];
        }

        vars.push({
          name: `${font.name} Font Weight`,
          varName: `--${varName}-font-weight`,
          value: fontWeightValue,
          category: "typography",
          label: `${font.name} Font Weight`,
        });

        // Add line height variable
        vars.push({
          name: `${font.name} Line Height`,
          varName: `--${varName}-line-height`,
          value: font.lineHeight || "1.5",
          category: "typography",
          label: `${font.name} Line Height`,
        });

        // Add letter spacing variable
        vars.push({
          name: `${font.name} Letter Spacing`,
          varName: `--${varName}-letter-spacing`,
          value: font.letterSpacing || "normal",
          category: "typography",
          label: `${font.name} Letter Spacing`,
        });

        // Add text transform variable
        vars.push({
          name: `${font.name} Text Transform`,
          varName: `--${varName}-text-transform`,
          value: font.textTransform || "none",
          category: "typography",
          label: `${font.name} Text Transform`,
        });
      }
    });

    // Merge default style guide with runtime overrides
    const styleGuide = { ...DEFAULT_STYLE_GUIDE, ...runtimeStyleGuide };

    // Style guide vars with categories and labels
    const styleVarMap: Record<string, { category: string; label: string }> = {
      // Sourced from theme.typography[] Heading/Body tokens via the orchestrator
      headingFontFamily: { category: "typography", label: "Heading Font Family" },
      bodyFontFamily: { category: "typography", label: "Body Font Family" },
      headingFontWeight: { category: "typography", label: "Heading Font Weight" },
      bodyFontWeight: { category: "typography", label: "Body Font Weight" },
      containerPadding: { category: "spacing", label: "Container Padding" },
      buttonPadding: { category: "spacing", label: "Button Padding" },
      sectionGap: { category: "spacing", label: "Section Gap" },
      containerGap: { category: "spacing", label: "Container Gap" },
      contentWidth: { category: "spacing", label: "Content Width" },
      borderRadius: { category: "other", label: "Border Radius" },
      shadowStyle: { category: "other", label: "Shadow Style" },
      inputBorderColor: { category: "colors", label: "Input Border Color" },
      border: { category: "other", label: "Border Width" },
      radiusField: { category: "other", label: "Radius Field" },
      inputPadding: { category: "spacing", label: "Input Padding" },
      inputBgColor: { category: "colors", label: "Input Background" },
      inputTextColor: { category: "colors", label: "Input Text" },
      inputPlaceholderColor: { category: "colors", label: "Input Placeholder" },
      inputFocusRing: { category: "other", label: "Input Focus Ring" },
      inputFocusRingColor: { category: "colors", label: "Input Focus Ring Color" },
      linkColor: { category: "colors", label: "Link Color" },
      linkHoverColor: { category: "colors", label: "Link Hover Color" },
      linkUnderline: { category: "other", label: "Link Underline" },
      linkUnderlineOffset: { category: "other", label: "Link Underline Offset" },
    };

    Object.entries(styleGuide).forEach(([key, value]) => {
      if (value && styleVarMap[key]) {
        const varName = key
          .replace(/([A-Z])/g, "-$1")
          .replace(/\s+/g, "-")
          .toLowerCase()
          .replace(/^-/, "");

        vars.push({
          name: key,
          varName: `--${varName}`,
          value: String(value),
          category: styleVarMap[key].category as any,
          label: styleVarMap[key].label,
        });
      }
    });

    return vars;
  });

  // Ensure designVars is always an array
  if (Array.isArray(designVars)) {
    return designVars;
  }

  if (designVars && typeof designVars === "object") {
    return Object.keys(designVars as any)
      .filter(key => !isNaN(Number(key)))
      .map(key => (designVars as any)[key])
      .filter(item => item && typeof item === "object" && "varName" in item);
  }

  return [];
}
