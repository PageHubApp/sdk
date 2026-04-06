/** Map of numeric font weights to Tailwind font-weight classes */
export const FONT_WEIGHT_MAP: Record<string, string> = {
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

/** Style guide variable metadata: category + display label */
export const STYLE_VAR_MAP: Record<string, { category: string; label: string }> = {
  headingFontFamily: { category: "typography", label: "Heading Font Family" },
  bodyFontFamily: { category: "typography", label: "Body Font Family" },
  headingFont: { category: "typography", label: "Heading Font Weight" },
  bodyFont: { category: "typography", label: "Body Font Weight" },
  containerPadding: { category: "spacing", label: "Container Padding" },
  buttonPadding: { category: "spacing", label: "Button Padding" },
  sectionGap: { category: "spacing", label: "Section Gap" },
  containerGap: { category: "spacing", label: "Container Gap" },
  contentWidth: { category: "spacing", label: "Content Width" },
  borderRadius: { category: "other", label: "Border Radius" },
  shadowStyle: { category: "other", label: "Shadow Style" },
  inputBorderColor: { category: "colors", label: "Input Border Color" },
  inputBorderWidth: { category: "other", label: "Input Border Width" },
  inputBorderRadius: { category: "other", label: "Input Border Radius" },
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

/** Maps CSS prefix to relevant design variable categories */
export const PREFIX_CATEGORIES: Record<string, string[]> = {
  // Color-related prefixes
  text: ["palette", "colors"],
  bg: ["palette", "colors"],
  border: ["palette", "colors"],
  ring: ["spacing", "colors", "palette"],
  "ring-offset": ["spacing", "colors", "palette"],
  outline: ["spacing", "colors", "palette"],
  "outline-offset": ["spacing", "colors", "palette"],

  // Spacing-related prefixes
  px: ["spacing"],
  py: ["spacing"],
  pt: ["spacing"],
  pb: ["spacing"],
  pl: ["spacing"],
  pr: ["spacing"],
  mt: ["spacing"],
  mb: ["spacing"],
  ml: ["spacing"],
  mr: ["spacing"],
  mx: ["spacing"],
  my: ["spacing"],
  gap: ["spacing"],
  w: ["spacing"],
  h: ["spacing"],
  "min-w": ["spacing"],
  "max-w": ["spacing"],
  "min-h": ["spacing"],
  "max-h": ["spacing"],

  // Typography-related prefixes
  font: ["typography"],

  // Other prefixes
  rounded: ["other"],
  shadow: ["other"],
  block: ["other"],
  static: ["other"],
  relative: ["other"],
  absolute: ["other"],
  fixed: ["other"],
  sticky: ["other"],
};

/** Human-readable labels for design variable categories */
export const CATEGORY_LABELS: Record<string, string> = {
  palette: "Palette Colors",
  typography: "Typography",
  spacing: "Spacing",
  colors: "Theme Colors",
  other: "Other",
};

/** All category keys (used as fallback when prefix has no mapping) */
export const ALL_CATEGORIES = ["palette", "typography", "spacing", "colors", "other"];
