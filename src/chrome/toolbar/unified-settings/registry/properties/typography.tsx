/**
 * Typography property definitions.
 */
import React from "react";
import { LoadingBarSuspenseFallback } from "../../../../primitives/LoadingBar";
import type { PropertyDef } from "../propertyDefs";

const LazyFontFamilyInput = React.lazy(() =>
  import("../../../inputs/typography/FontFamilyInput").then(m => ({ default: m.FontFamilyInput }))
);

const LazyTypographyPresetInput = React.lazy(() =>
  import("../../../inputs/typography/TypographyPresetInput").then(m => ({
    default: m.TypographyPresetInput,
  }))
);

export const typographyProperties: PropertyDef[] = [
  // ─── Main (visible by default) ───────────────────────────────────
  {
    id: "typographyPreset",
    label: "Preset",
    section: "typography",
    keywords: ["preset", "typography", "style", "heading", "body", "accent"],
    input: {
      type: "custom",
      component: props => (
        <React.Suspense fallback={<LoadingBarSuspenseFallback />}>
          <LazyTypographyPresetInput {...props} />
        </React.Suspense>
      ),
    },
    sortOrder: -10,
    inline: true,
  },
  {
    id: "textAlign",
    label: "Text Align",
    section: "typography",
    keywords: ["align", "left", "center", "right", "justify", "start", "end"],
    input: { type: "tailwind-radio", tailwindKey: "textAlign", cols: true },
    sortOrder: 0,
  },
  {
    id: "fontFamily",
    label: "Family",
    section: "typography",
    keywords: ["font", "family", "typeface", "google", "heading", "body", "accent"],
    input: {
      type: "custom",
      component: () => (
        <React.Suspense fallback={<LoadingBarSuspenseFallback />}>
          <LazyFontFamilyInput />
        </React.Suspense>
      ),
    },
    sortOrder: 10,
  },
  {
    id: "fontSize",
    label: "Size",
    section: "typography",
    keywords: ["size", "text", "large", "small", "xl", "2xl", "3xl"],
    input: {
      type: "tailwind-select",
      tailwindKey: "fontSize",
      showVarSelector: true,
      varSelectorPrefix: "text",
    },
    sortOrder: 20,
  },
  {
    id: "fontWeight",
    label: "Weight",
    section: "typography",
    keywords: ["weight", "bold", "light", "semibold", "thin", "medium", "heavy"],
    input: {
      type: "tailwind-select",
      tailwindKey: "fontWeight",
      showVarSelector: true,
      varSelectorPrefix: "font",
    },
    sortOrder: 30,
  },
  {
    id: "textColor",
    label: "Color",
    section: "typography",
    keywords: ["color", "text", "foreground", "font color"],
    input: { type: "color", prefix: "text" },
    hideKey: "textColor",
    sortOrder: 40,
    inline: true,
  },

  // ─── Advanced (behind toggle) ────────────────────────────────────
  {
    id: "lineHeight",
    label: "Line Height",
    section: "typography",
    keywords: ["line", "height", "leading", "spacing", "vertical"],
    input: { type: "tailwind-select", tailwindKey: "lineHeight" },
    advancedGroup: "spacing",
    sortOrder: 100,
  },
  {
    id: "tracking",
    label: "Tracking",
    section: "typography",
    keywords: ["tracking", "letter", "spacing", "kerning"],
    input: { type: "tailwind-select", tailwindKey: "tracking" },
    advancedGroup: "spacing",
    sortOrder: 110,
  },
  {
    id: "transform",
    label: "Transform",
    section: "typography",
    keywords: ["transform", "uppercase", "lowercase", "capitalize", "case"],
    input: { type: "tailwind-select", tailwindKey: "transform" },
    advancedGroup: "other",
    sortOrder: 120,
  },
  {
    id: "wordBreak",
    label: "Word Break",
    section: "typography",
    keywords: ["word", "break", "wrap", "overflow"],
    input: { type: "tailwind-select", tailwindKey: "wordBreak" },
    advancedGroup: "wrapping",
    sortOrder: 130,
  },
  {
    id: "textOverflow",
    label: "Overflow",
    section: "typography",
    keywords: ["overflow", "ellipsis", "truncate", "clip"],
    input: { type: "tailwind-select", tailwindKey: "textOverflow" },
    advancedGroup: "wrapping",
    sortOrder: 140,
  },
  {
    id: "indent",
    label: "Indent",
    section: "typography",
    keywords: ["indent", "paragraph", "first line"],
    input: { type: "tailwind-select", tailwindKey: "indent" },
    advancedGroup: "other",
    sortOrder: 150,
  },
  {
    id: "textDecoration",
    label: "Line",
    section: "typography",
    keywords: ["decoration", "underline", "line-through", "strikethrough", "overline"],
    input: { type: "tailwind-select", tailwindKey: "textDecoration" },
    advancedGroup: "decoration",
    sortOrder: 160,
  },
  {
    id: "decorationStyle",
    label: "Style",
    section: "typography",
    keywords: ["decoration", "style", "solid", "double", "dotted", "dashed", "wavy"],
    input: { type: "tailwind-select", tailwindKey: "decorationStyle" },
    advancedGroup: "decoration",
    sortOrder: 170,
  },
  {
    id: "decorationThickness",
    label: "Thickness",
    section: "typography",
    keywords: ["decoration", "thickness", "size", "width"],
    input: { type: "tailwind-select", tailwindKey: "decorationThickness" },
    advancedGroup: "decoration",
    sortOrder: 180,
  },
  {
    id: "fontStyle",
    label: "Style",
    section: "typography",
    keywords: ["italic", "oblique", "style", "emphasis"],
    input: { type: "tailwind-select", tailwindKey: "fontStyle" },
    advancedGroup: "other",
    sortOrder: 190,
  },
  {
    id: "whiteSpace",
    label: "White Space",
    section: "typography",
    keywords: ["white", "space", "nowrap", "pre", "wrap"],
    input: { type: "tailwind-select", tailwindKey: "whiteSpace" },
    advancedGroup: "wrapping",
    sortOrder: 200,
  },
  {
    id: "textWrap",
    label: "Wrap",
    section: "typography",
    keywords: ["wrap", "balance", "pretty", "nowrap"],
    input: { type: "tailwind-select", tailwindKey: "textWrap" },
    advancedGroup: "wrapping",
    sortOrder: 210,
  },
  {
    id: "hyphens",
    label: "Hyphens",
    section: "typography",
    keywords: ["hyphens", "hyphenation", "break"],
    input: { type: "tailwind-select", tailwindKey: "hyphens" },
    advancedGroup: "wrapping",
    sortOrder: 220,
  },
];
