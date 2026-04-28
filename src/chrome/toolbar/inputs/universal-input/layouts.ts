// Layout configurations for different Tailwind property types

export interface DropdownLayoutConfig {
  layout: "left-right" | "stacked" | "grid";
  columns?: {
    count: 2 | 3;
    widths: string[]; // Tailwind width classes like "w-1/2", "w-2/5", etc.
  };
  leftSection?: {
    title: string;
    groups: ("named" | "numeric" | "fractions" | "tokens" | "other")[];
    showHints?: boolean;
    hintType?: "pixel" | "percentage" | "ms" | "custom";
    showPreview?: "cursor" | "color" | "shadow";
    disableSubgroups?: boolean;
  };
  middleSection?: {
    title: string;
    groups: ("named" | "numeric" | "fractions" | "tokens" | "other")[];
    showHints?: boolean;
    hintType?: "pixel" | "percentage" | "ms" | "custom";
    showPreview?: "cursor" | "color" | "shadow";
    disableSubgroups?: boolean;
  };
  rightSection?: {
    title: string;
    groups: ("named" | "numeric" | "fractions" | "tokens" | "other")[];
    showHints?: boolean;
    hintType?: "pixel" | "percentage" | "ms" | "custom";
    showPreview?: "cursor" | "color" | "shadow";
    disableSubgroups?: boolean;
  };
  stackedOrder?: ("named" | "numeric" | "fractions" | "other")[];
}

// ============================================================================
// COMMON LAYOUT PRESETS
// ============================================================================

/** First columns hug labels; last column takes remaining space (avoids huge empty gutters). */
const THREE_COL_COMPACT: [string, string, string] = [
  "w-auto shrink-0 min-w-14",
  "w-auto shrink-0 min-w-14",
  "min-w-0 flex-1",
];

export const COMMON_SIZING_LAYOUT: DropdownLayoutConfig = {
  layout: "left-right",
  columns: {
    count: 3,
    widths: [...THREE_COL_COMPACT],
  },
  leftSection: {
    title: "",
    groups: ["named"],
    showHints: true,
    hintType: "pixel",
  },
  middleSection: {
    title: "",
    groups: ["numeric"],
    showHints: true,
    hintType: "pixel",
  },
  rightSection: {
    title: "",
    groups: ["fractions"],
    showHints: true,
    hintType: "percentage",
  },
};

/** Named / subgroup column narrow; numeric + hints use the rest (no 50% dead space). */
const TWO_COL_COMPACT: [string, string] = ["w-auto shrink-0 min-w-11", "min-w-0 flex-1"];

/** Numeric-first layout that still exposes named/fraction/other fallback values.
 * Flat by default — subgrouping uses spacing-tier thresholds (≤3/≤8/≤24) that only
 * suit spacing-style value scales. Properties whose values benefit from S/M/L/XL
 * tiering (rotate, translateX/Y) should use COMMON_NUMERIC_SUBGROUPED_LAYOUT instead. */
export const COMMON_NUMERIC_LAYOUT: DropdownLayoutConfig = {
  layout: "left-right",
  columns: {
    count: 2,
    widths: [...TWO_COL_COMPACT],
  },
  leftSection: {
    title: "",
    groups: ["numeric"],
    showHints: false,
    disableSubgroups: true,
  },
  rightSection: {
    title: "",
    groups: ["named", "fractions", "other"],
    showHints: false,
  },
};

/** Numeric layout with S/M/L/XL subgrouping. Use for properties whose values span the
 * spacing-tier thresholds (≤3/≤8/≤24/>24): rotate (0/1/2/3/6/12/45/90/180),
 * translateX/Y (full spacing scale 0..96 + fractions). */
export const COMMON_NUMERIC_SUBGROUPED_LAYOUT: DropdownLayoutConfig = {
  layout: "left-right",
  columns: {
    count: 2,
    widths: [...TWO_COL_COMPACT],
  },
  leftSection: {
    title: "",
    groups: ["numeric"],
    showHints: false,
  },
  rightSection: {
    title: "",
    groups: ["named", "fractions", "other"],
    showHints: false,
  },
};

/** Named-first split layout that still exposes `other` bucket values. */
export const COMMON_NAMED_OTHER_SPLIT_LAYOUT: DropdownLayoutConfig = {
  layout: "left-right",
  columns: {
    count: 2,
    widths: [...TWO_COL_COMPACT],
  },
  leftSection: {
    title: "",
    groups: ["named"],
    showHints: false,
  },
  rightSection: {
    title: "",
    groups: ["other"],
    showHints: false,
  },
};

export const COMMON_SPACING_LAYOUT: DropdownLayoutConfig = {
  layout: "left-right",
  columns: {
    count: 2,
    widths: [...TWO_COL_COMPACT],
  },
  leftSection: {
    title: "",
    groups: ["tokens", "named"],
    showHints: true,
    hintType: "pixel",
  },
  rightSection: {
    title: "",
    groups: ["numeric"],
    showHints: true,
    hintType: "pixel",
  },
};

export const COMMON_NAMED_ONLY_LAYOUT: DropdownLayoutConfig = {
  layout: "stacked",
  stackedOrder: ["named"],
  columns: {
    count: 2,
    widths: ["w-full", "w-0"],
  },
  leftSection: {
    title: "",
    groups: ["named"],
    showHints: false,
  },
};

/** Time values (duration/delay): flat numeric list with ms hints. Subgroups disabled
 * because Tailwind ships ~9 values total (0/75/100/150/200/300/500/700/1000) that all
 * sit far above the spacing-unit thresholds groupNumericByRange uses (≤3/≤8/≤24), so
 * subgrouping would dump everything into XL and leave S/M/L empty. */
export const COMMON_TIME_LAYOUT: DropdownLayoutConfig = {
  layout: "left-right",
  columns: {
    count: 2,
    widths: [...TWO_COL_COMPACT],
  },
  leftSection: {
    title: "",
    groups: ["numeric"],
    showHints: true,
    hintType: "ms",
    disableSubgroups: true,
  },
  rightSection: {
    title: "",
    groups: ["named", "other"],
    showHints: false,
  },
};

/** Keyword bucket + everything else (axis variants, numeric theme steps, arbitrary). */
export const COMMON_NAMED_OTHER_COLUMN: DropdownLayoutConfig = {
  layout: "left-right",
  columns: {
    count: 2,
    widths: ["w-full", "w-0"],
  },
  leftSection: {
    title: "",
    groups: ["named", "other"],
    showHints: false,
  },
};

/** `ring`, `ring-inset`, `outline-none`, dashed, etc. + numeric steps (`ring-2`, `outline-1`, …). */
export const RING_LIKE_WIDTH_LAYOUT: DropdownLayoutConfig = {
  layout: "left-right",
  columns: {
    count: 2,
    widths: [...TWO_COL_COMPACT],
  },
  leftSection: {
    title: "",
    groups: ["named", "other"],
    showHints: false,
  },
  rightSection: {
    title: "",
    groups: ["numeric"],
    showHints: true,
    hintType: "pixel",
  },
};

// ============================================================================
// PROPERTY-SPECIFIC LAYOUTS
// ============================================================================

export const DROPDOWN_LAYOUTS: Record<string, DropdownLayoutConfig> = {
  // ========== SIZING PROPERTIES (with fractions) ==========
  width: COMMON_SIZING_LAYOUT,
  height: COMMON_SIZING_LAYOUT,
  maxWidth: COMMON_SIZING_LAYOUT,
  minHeight: COMMON_SIZING_LAYOUT,

  // ========== SPACING PROPERTIES (no fractions) ==========
  margin: COMMON_SPACING_LAYOUT,
  padding: COMMON_SPACING_LAYOUT,
  gap: COMMON_SPACING_LAYOUT,
  gapX: COMMON_SPACING_LAYOUT,
  gapY: COMMON_SPACING_LAYOUT,

  ringWidth: RING_LIKE_WIDTH_LAYOUT,
  ringOffsetWidth: RING_LIKE_WIDTH_LAYOUT,
  outlineWidth: RING_LIKE_WIDTH_LAYOUT,

  // ========== BORDER & SHADOW PROPERTIES ==========
  radius: {
    layout: "left-right",
    columns: {
      count: 2,
      widths: [...TWO_COL_COMPACT],
    },
    leftSection: {
      title: "",
      groups: ["named"],
      showHints: false,
    },
    rightSection: {
      title: "",
      // sm/md/lg/xl/2xl/3xl land in "other" (not the numeric bucket); include both columns
      groups: ["numeric", "other"],
      showHints: false,
    },
  },

  border: {
    layout: "left-right",
    columns: {
      count: 2,
      widths: [...TWO_COL_COMPACT],
    },
    leftSection: {
      title: "",
      groups: ["named"],
      showHints: false,
    },
    rightSection: {
      title: "",
      groups: ["numeric"],
      showHints: true,
      hintType: "pixel",
    },
  },

  shadow: {
    layout: "left-right",
    columns: {
      count: 2,
      widths: ["w-full", "w-0"],
    },
    leftSection: {
      title: "",
      groups: ["named", "other"],
      showHints: false,
      showPreview: "shadow",
    },
  },
  borderStyle: COMMON_NAMED_OTHER_COLUMN,

  // ========== OPACITY ==========
  opacity: {
    layout: "left-right",
    columns: {
      count: 2,
      widths: ["w-full", "w-0"],
    },
    leftSection: {
      title: "",
      groups: ["numeric"],
      showHints: true,
      hintType: "percentage",
      disableSubgroups: true,
    },
  },
  bgOpacity: {
    layout: "left-right",
    columns: {
      count: 2,
      widths: [...TWO_COL_COMPACT],
    },
    leftSection: {
      title: "",
      groups: ["named"],
      showHints: true,
      hintType: "percentage",
    },
    rightSection: {
      title: "",
      groups: ["numeric"],
      showHints: true,
      hintType: "percentage",
      disableSubgroups: true,
    },
  },

  // ========== LAYOUT & DISPLAY ==========
  display: COMMON_NAMED_OTHER_COLUMN,
  position: COMMON_NAMED_OTHER_COLUMN,
  cursor: {
    layout: "left-right",
    columns: {
      count: 2,
      widths: [...TWO_COL_COMPACT],
    },
    leftSection: {
      title: "",
      groups: ["named"],
      showHints: false,
      showPreview: "cursor",
    },
    rightSection: {
      title: "",
      groups: ["other"],
      showHints: false,
      showPreview: "cursor",
    },
  },
  // Like shadow: most overflow-* utilities bucket to "other" (hidden, scroll, x/y); only a few
  // keywords match "named" (e.g. auto). COMMON_NAMED_ONLY_LAYOUT hid the whole "other" column.
  overflow: {
    layout: "left-right",
    columns: {
      count: 2,
      widths: ["w-full", "w-0"],
    },
    leftSection: {
      title: "",
      groups: ["named", "other"],
      showHints: false,
    },
  },
  scrollBehavior: COMMON_NAMED_OTHER_COLUMN,
  scrollSnapType: COMMON_NAMED_OTHER_SPLIT_LAYOUT,
  scrollSnapAlign: COMMON_NAMED_OTHER_SPLIT_LAYOUT,
  scrollSnapStop: COMMON_NAMED_OTHER_SPLIT_LAYOUT,
  overscrollBehavior: COMMON_NAMED_OTHER_SPLIT_LAYOUT,
  overscrollBehaviorX: COMMON_NAMED_OTHER_SPLIT_LAYOUT,
  overscrollBehaviorY: COMMON_NAMED_OTHER_SPLIT_LAYOUT,

  // ========== FLEXBOX ==========
  flexDirection: COMMON_NAMED_ONLY_LAYOUT,
  alignItems: COMMON_NAMED_ONLY_LAYOUT,
  justifyContent: COMMON_NAMED_ONLY_LAYOUT,

  // ========== TYPOGRAPHY ==========
  // Most typography scale values (text-xs / text-sm / text-base / font-bold / …)
  // bucket into `other` after the prefix is stripped, so we need both groups.
  fontSize: COMMON_NAMED_OTHER_COLUMN,
  fontWeight: COMMON_NAMED_OTHER_COLUMN,
  textAlign: COMMON_NAMED_OTHER_COLUMN,

  // ========== CLASS EFFECTS (Tailwind transition / transform / filter / backdrop) ==========
  transitionProperty: COMMON_NAMED_OTHER_COLUMN,
  duration: COMMON_TIME_LAYOUT,
  delay: COMMON_TIME_LAYOUT,
  ease: COMMON_NAMED_OTHER_COLUMN,
  twAnimate: COMMON_NAMED_OTHER_COLUMN,
  scale: COMMON_NUMERIC_LAYOUT,
  scaleX: COMMON_NUMERIC_LAYOUT,
  scaleY: COMMON_NUMERIC_LAYOUT,
  rotate: COMMON_NUMERIC_SUBGROUPED_LAYOUT,
  translateX: COMMON_NUMERIC_SUBGROUPED_LAYOUT,
  translateY: COMMON_NUMERIC_SUBGROUPED_LAYOUT,
  skewX: COMMON_NUMERIC_LAYOUT,
  skewY: COMMON_NUMERIC_LAYOUT,
  transformOrigin: COMMON_NAMED_OTHER_COLUMN,
  twTransform: COMMON_NAMED_OTHER_COLUMN,
  blur: COMMON_NUMERIC_LAYOUT,
  brightness: COMMON_NUMERIC_LAYOUT,
  contrast: COMMON_NUMERIC_LAYOUT,
  grayscale: COMMON_NUMERIC_LAYOUT,
  hueRotate: COMMON_NUMERIC_LAYOUT,
  invert: COMMON_NUMERIC_LAYOUT,
  saturate: COMMON_NUMERIC_LAYOUT,
  sepia: COMMON_NUMERIC_LAYOUT,
  willChange: COMMON_NAMED_OTHER_COLUMN,
  backdropBlur: COMMON_NUMERIC_LAYOUT,
  backdropOpacity: COMMON_NUMERIC_LAYOUT,
  backdropBrightness: COMMON_NUMERIC_LAYOUT,
  backdropContrast: COMMON_NUMERIC_LAYOUT,
  backdropGrayscale: COMMON_NUMERIC_LAYOUT,
  backdropHueRotate: COMMON_NUMERIC_LAYOUT,
  backdropInvert: COMMON_NUMERIC_LAYOUT,
  backdropSaturate: COMMON_NUMERIC_LAYOUT,
  backdropSepia: COMMON_NUMERIC_LAYOUT,
};

// ============================================================================
// PROPERTY TAG MAPPINGS
// ============================================================================

export const PROP_TAG_MAPPINGS: Record<string, string> = {
  // Width & Height
  w: "width",
  h: "height",

  // Margin
  m: "margin",
  mt: "margin",
  mb: "margin",
  ml: "margin",
  mr: "margin",
  mx: "margin",
  my: "margin",

  // Padding
  p: "padding",
  pt: "padding",
  pb: "padding",
  pl: "padding",
  pr: "padding",
  px: "padding",
  py: "padding",

  // Border & Radius
  rounded: "radius",
  "rounded-t": "radius",
  "rounded-b": "radius",
  "rounded-l": "radius",
  "rounded-r": "radius",
  "rounded-tl": "radius",
  "rounded-tr": "radius",
  "rounded-bl": "radius",
  "rounded-br": "radius",
  border: "border",
  "border-t": "border",
  "border-b": "border",
  "border-l": "border",
  "border-r": "border",

  // Max/Min sizing
  "max-w": "maxWidth",
  "min-h": "minHeight",

  // Other
  gap: "gap",
  "gap-x": "gap",
  "gap-y": "gap",
  shadow: "shadow",
  opacity: "opacity",
  "bg-opacity": "bgOpacity",
  cursor: "cursor",
  overflow: "overflow",

  transition: "transitionProperty",
  duration: "duration",
  delay: "delay",
  ease: "ease",
  animate: "twAnimate",
  scale: "scale",
  "scale-x": "scaleX",
  "scale-y": "scaleY",
  rotate: "rotate",
  "translate-x": "translateX",
  "translate-y": "translateY",
  "skew-x": "skewX",
  "skew-y": "skewY",
  origin: "transformOrigin",
  blur: "blur",
  brightness: "brightness",
  contrast: "contrast",
  grayscale: "grayscale",
  "hue-rotate": "hueRotate",
  invert: "invert",
  saturate: "saturate",
  sepia: "sepia",
  "will-change": "willChange",
  "backdrop-blur": "backdropBlur",
  "backdrop-opacity": "backdropOpacity",
  "backdrop-brightness": "backdropBrightness",
  "backdrop-contrast": "backdropContrast",
  "backdrop-grayscale": "backdropGrayscale",
  "backdrop-hue-rotate": "backdropHueRotate",
  "backdrop-invert": "backdropInvert",
  "backdrop-saturate": "backdropSaturate",
  "backdrop-sepia": "backdropSepia",
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getLayoutConfig = (propTag?: string, tailwindKey?: string): DropdownLayoutConfig => {
  // Try to match by propTag first
  if (propTag) {
    const configKey = PROP_TAG_MAPPINGS[propTag];
    if (configKey && DROPDOWN_LAYOUTS[configKey]) {
      return DROPDOWN_LAYOUTS[configKey];
    }
  }

  // Try to match by tailwindKey
  if (tailwindKey && DROPDOWN_LAYOUTS[tailwindKey]) {
    return DROPDOWN_LAYOUTS[tailwindKey];
  }

  // Default fallback shows both named + other so multi-segment tailwind values
  // (e.g. `pointer-events-auto`, `border-solid`) that bucket into `other` stay
  // visible. NAMED_ONLY would silently hide them.
  return COMMON_NAMED_OTHER_COLUMN;
};
