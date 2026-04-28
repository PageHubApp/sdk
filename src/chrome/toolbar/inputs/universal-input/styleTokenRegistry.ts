/**
 * STYLE_TOKEN_REGISTRY — single source of truth for built-in design-token
 * metadata. Every key in `theme.styleGuide` that should appear in the
 * VarPicker must have an entry here; unknown keys are treated as user-created
 * (custom) tokens.
 *
 * Per-entry fields:
 * - `label`     — human-readable name shown in the picker
 * - `category`  — drives the relevance filter in VarPicker (palette / colors /
 *                 spacing / typography / other)
 * - `type`      — drives the value editor in VarEditor (color / dimension /
 *                 number / text)
 * - `quickPicks` — optional presets shown above the value editor for `text`
 *                  and `dimension` types whose useful values are a small
 *                  enumerated set (shadow classes, padding shorthands, …)
 */

export type StyleTokenCategory = "palette" | "colors" | "spacing" | "typography" | "other";

export type StyleTokenType = "color" | "dimension" | "number" | "text";

export interface StyleTokenRegistryEntry {
  label: string;
  category: StyleTokenCategory;
  type: StyleTokenType;
  /** Click-to-fill presets shown above the value editor. `value` is written
   *  verbatim to `theme.styleGuide[key]`; `label` is the human-readable hint. */
  quickPicks?: { value: string; label: string }[];
}

export const STYLE_TOKEN_REGISTRY: Record<string, StyleTokenRegistryEntry> = {
  // ── Typography (sourced from theme.typography[] Heading/Body via orchestrator) ──
  headingFontFamily: { label: "Heading Font Family", category: "typography", type: "text" },
  bodyFontFamily: { label: "Body Font Family", category: "typography", type: "text" },
  headingFontWeight: { label: "Heading Font Weight", category: "typography", type: "text" },
  bodyFontWeight: { label: "Body Font Weight", category: "typography", type: "text" },

  // ── Spacing & Layout ──
  contentWidth: {
    label: "Content Width",
    category: "spacing",
    type: "dimension",
    quickPicks: [
      { value: "48rem", label: "Narrow" },
      { value: "64rem", label: "XL" },
      { value: "80rem", label: "2XL" },
      { value: "96rem", label: "3XL" },
      { value: "120rem", label: "4XL" },
      { value: "100%", label: "Full" },
    ],
  },
  containerPadding: {
    label: "Page Gutter",
    category: "spacing",
    type: "text",
    quickPicks: [
      { value: "0.5rem 0.5rem", label: "Tight" },
      { value: "1rem 1rem", label: "Small" },
      { value: "1.5rem 1.5rem", label: "Medium" },
      { value: "2rem 2rem", label: "Large" },
      { value: "3rem 3rem", label: "XL" },
    ],
  },
  sectionGap: {
    label: "Section Gap",
    category: "spacing",
    type: "dimension",
    quickPicks: [
      { value: "0", label: "None" },
      { value: "2rem", label: "Small" },
      { value: "3rem", label: "Medium" },
      { value: "4rem", label: "Large" },
      { value: "6rem", label: "XL" },
      { value: "8rem", label: "2XL" },
    ],
  },
  containerGap: {
    label: "Container Gap",
    category: "spacing",
    type: "dimension",
    quickPicks: [
      { value: "0.5rem", label: "Tight" },
      { value: "1rem", label: "Small" },
      { value: "1.5rem", label: "Medium" },
      { value: "2rem", label: "Large" },
    ],
  },
  buttonPadding: {
    label: "Button Padding",
    category: "spacing",
    type: "text",
    quickPicks: [
      { value: "1rem 0.5rem", label: "Small" },
      { value: "1.25rem 0.625rem", label: "Medium" },
      { value: "1.5rem 0.75rem", label: "Large" },
      { value: "2rem 1rem", label: "XL" },
    ],
  },

  // ── Spatial Scale (clamp() values — text editor) ──
  spaceXs: {
    label: "Space XS",
    category: "spacing",
    type: "text",
    quickPicks: [
      { value: "clamp(0.25rem, 0.125rem + 0.4vw, 0.375rem)", label: "Tight" },
      { value: "clamp(0.375rem, 0.25rem + 0.39vw, 0.5rem)", label: "Default" },
      { value: "clamp(0.5rem, 0.375rem + 0.4vw, 0.625rem)", label: "Loose" },
    ],
  },
  spaceSm: {
    label: "Space SM",
    category: "spacing",
    type: "text",
    quickPicks: [
      { value: "clamp(0.5rem, 0.25rem + 0.75vw, 0.75rem)", label: "Tight" },
      { value: "clamp(0.75rem, 0.5rem + 0.75vw, 1rem)", label: "Default" },
      { value: "clamp(1rem, 0.75rem + 0.75vw, 1.25rem)", label: "Loose" },
    ],
  },
  spaceMd: {
    label: "Space MD",
    category: "spacing",
    type: "text",
    quickPicks: [
      { value: "clamp(1rem, 0.5rem + 1.5vw, 1.5rem)", label: "Tight" },
      { value: "clamp(1.5rem, 1rem + 1.5vw, 2rem)", label: "Default" },
      { value: "clamp(2rem, 1.5rem + 1.5vw, 2.5rem)", label: "Loose" },
    ],
  },
  spaceLg: {
    label: "Space LG",
    category: "spacing",
    type: "text",
    quickPicks: [
      { value: "clamp(2rem, 1rem + 3vw, 3rem)", label: "Tight" },
      { value: "clamp(2.5rem, 1.25rem + 3.75vw, 4rem)", label: "Default" },
      { value: "clamp(3rem, 1.5rem + 4.5vw, 5rem)", label: "Loose" },
    ],
  },
  spaceXl: {
    label: "Space XL",
    category: "spacing",
    type: "text",
    quickPicks: [
      { value: "clamp(2.5rem, 1.25rem + 3.75vw, 4rem)", label: "Tight" },
      { value: "clamp(3.5rem, 1.75rem + 5.25vw, 6rem)", label: "Default" },
      { value: "clamp(4.5rem, 2.25rem + 6.75vw, 8rem)", label: "Loose" },
    ],
  },

  // ── Effects & Borders ──
  radiusBox: {
    label: "Radius Box",
    category: "other",
    type: "dimension",
    quickPicks: [
      { value: "0", label: "Square" },
      { value: "0.25rem", label: "Small" },
      { value: "0.5rem", label: "Default" },
      { value: "0.75rem", label: "Medium" },
      { value: "1rem", label: "Large" },
      { value: "1.5rem", label: "XL" },
      { value: "2rem", label: "2XL" },
      { value: "9999px", label: "Full" },
    ],
  },
  radiusField: {
    label: "Radius Field",
    category: "other",
    type: "dimension",
    quickPicks: [
      { value: "0", label: "Square" },
      { value: "0.25rem", label: "Small" },
      { value: "0.375rem", label: "Default" },
      { value: "0.5rem", label: "Medium" },
      { value: "0.75rem", label: "Large" },
      { value: "1rem", label: "XL" },
      { value: "9999px", label: "Full" },
    ],
  },
  radiusSelector: {
    label: "Radius Selector",
    category: "other",
    type: "dimension",
    quickPicks: [
      { value: "0", label: "Square" },
      { value: "0.25rem", label: "Small" },
      { value: "0.5rem", label: "Default" },
      { value: "0.75rem", label: "Medium" },
      { value: "1rem", label: "Large" },
      { value: "1.5rem", label: "XL" },
      { value: "9999px", label: "Full" },
    ],
  },
  border: {
    label: "Border Width",
    category: "other",
    type: "dimension",
    quickPicks: [
      { value: "0", label: "None" },
      { value: "1px", label: "Default" },
      { value: "2px", label: "Medium" },
      { value: "4px", label: "Thick" },
    ],
  },
  shadowStyle: {
    label: "Shadow Style",
    category: "other",
    type: "text",
    quickPicks: [
      { value: "none", label: "None" },
      { value: "0 1px 2px 0 rgb(0 0 0 / 0.05)", label: "Small" },
      { value: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)", label: "Default" },
      {
        value: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        label: "Medium",
      },
      {
        value: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        label: "Large",
      },
      {
        value: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        label: "XL",
      },
      { value: "0 25px 50px -12px rgb(0 0 0 / 0.25)", label: "2XL" },
    ],
  },
  depth: {
    label: "Depth",
    category: "other",
    type: "number",
    quickPicks: [
      { value: "0", label: "Flat" },
      { value: "1", label: "Raised" },
      { value: "2", label: "Elevated" },
    ],
  },
  noise: {
    label: "Noise Texture",
    category: "other",
    type: "number",
    quickPicks: [
      { value: "0", label: "Off" },
      { value: "1", label: "On" },
    ],
  },

  // ── Sizing ──
  sizeField: {
    label: "Field Size",
    category: "other",
    type: "dimension",
    quickPicks: [
      { value: "0.2rem", label: "Small" },
      { value: "0.25rem", label: "Default" },
      { value: "0.3rem", label: "Medium" },
      { value: "0.35rem", label: "Large" },
    ],
  },
  sizeSelector: {
    label: "Selector Size",
    category: "other",
    type: "dimension",
    quickPicks: [
      { value: "0.2rem", label: "Small" },
      { value: "0.25rem", label: "Default" },
      { value: "0.3rem", label: "Medium" },
      { value: "0.35rem", label: "Large" },
    ],
  },

  // ── Form Inputs ──
  inputPadding: {
    label: "Input Padding",
    category: "spacing",
    type: "text",
    quickPicks: [
      { value: "0.5rem 0.25rem", label: "Small" },
      { value: "0.75rem 0.5rem", label: "Medium" },
      { value: "1rem 0.5rem", label: "Large" },
      { value: "1rem 0.75rem", label: "XL" },
    ],
  },
  inputBorderColor: { label: "Input Border", category: "colors", type: "color" },
  inputBgColor: { label: "Input Background", category: "colors", type: "color" },
  inputTextColor: { label: "Input Text", category: "colors", type: "color" },
  inputPlaceholderColor: { label: "Input Placeholder", category: "colors", type: "color" },
  inputFocusRing: {
    label: "Input Focus Ring",
    category: "other",
    type: "dimension",
    quickPicks: [
      { value: "0", label: "None" },
      { value: "1px", label: "1px" },
      { value: "2px", label: "2px" },
      { value: "3px", label: "3px" },
      { value: "4px", label: "4px" },
    ],
  },
  inputFocusRingColor: { label: "Input Focus Ring Color", category: "colors", type: "color" },

  // ── Links ──
  linkColor: { label: "Link Color", category: "colors", type: "color" },
  linkHoverColor: { label: "Link Hover Color", category: "colors", type: "color" },
  linkUnderline: {
    label: "Link Underline",
    category: "other",
    type: "text",
    quickPicks: [
      { value: "no-underline", label: "None" },
      { value: "underline", label: "Always" },
      { value: "hover:underline", label: "On Hover" },
    ],
  },
  linkUnderlineOffset: {
    label: "Underline Offset",
    category: "other",
    type: "text",
    quickPicks: [
      { value: "underline-offset-auto", label: "Auto" },
      { value: "underline-offset-1", label: "1px" },
      { value: "underline-offset-2", label: "2px" },
      { value: "underline-offset-4", label: "4px" },
      { value: "underline-offset-8", label: "8px" },
    ],
  },
};

/** Keys NOT to surface as tokens in the picker — they're not editable per-token
 *  (e.g. `spacingDensity` is a global multiplier driven by the StylesTab slider). */
export const NON_TOKEN_STYLE_KEYS = new Set<string>(["spacingDensity"]);

/** Heuristic: infer a token type from a styleGuide value. Used for unknown
 *  (user-created) keys when `styleGuideMeta[key].appliesTo` doesn't pin it. */
export function inferTokenType(value: string): StyleTokenType {
  if (!value) return "text";
  const v = value.trim();
  if (/^(#|oklch\(|rgba?\(|hsla?\(|hsl\()/i.test(v)) return "color";
  if (/^-?\d+(\.\d+)?$/.test(v)) return "number";
  // Single-value dimension: "1rem", "16px", "10%", "50vh"
  if (/^-?\d+(\.\d+)?(px|rem|em|%|vh|vw|vmin|vmax)$/.test(v)) return "dimension";
  return "text";
}

/** Heuristic: infer a category from a token type when no explicit appliesTo. */
export function inferCategory(type: StyleTokenType): StyleTokenCategory {
  switch (type) {
    case "color":
      return "colors";
    case "dimension":
      return "spacing";
    case "number":
    case "text":
      return "other";
  }
}

/** CSS var slug from a styleGuide key (e.g. `containerPadding` →
 *  `--container-padding`). Mirrors `toStyleCSSVarName` from
 *  `utils/design/designSystemVars.ts` so the picker UI doesn't need to import
 *  that module. Kept in sync with `STYLE_VAR_OVERRIDES` if any are added. */
export function styleKeyToVarName(key: string): string {
  return `--${key
    .replace(/([A-Z])/g, "-$1")
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/^-/, "")}`;
}
