// Layout configurations for different Tailwind property types

export interface DropdownLayoutConfig {
  layout: "left-right" | "stacked" | "grid";
  columns?: {
    count: 2 | 3;
    widths: string[]; // Tailwind width classes like "w-1/2", "w-2/5", etc.
  };
  leftSection?: {
    title: string;
    groups: ("named" | "numeric" | "other")[];
    showHints?: boolean;
    hintType?: "pixel" | "percentage" | "custom";
    showPreview?: "cursor" | "color" | "shadow";
    disableSubgroups?: boolean;
  };
  middleSection?: {
    title: string;
    groups: "numeric"[];
    showHints?: boolean;
    hintType?: "pixel" | "percentage" | "custom";
    showPreview?: "cursor" | "color" | "shadow";
    disableSubgroups?: boolean;
  };
  rightSection?: {
    title: string;
    groups: ("named" | "numeric" | "fractions" | "other")[];
    showHints?: boolean;
    hintType?: "pixel" | "percentage" | "custom";
    showPreview?: "cursor" | "color" | "shadow";
    disableSubgroups?: boolean;
  };
  stackedOrder?: ("named" | "numeric" | "fractions" | "other")[];
}

// ============================================================================
// COMMON LAYOUT PRESETS
// ============================================================================

export const COMMON_SIZING_LAYOUT: DropdownLayoutConfig = {
  layout: "left-right",
  columns: {
    count: 3,
    widths: ["w-2/5", "w-1/5", "w-2/5"], // Left (40%), Middle (20%), Right (40%)
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

export const COMMON_SPACING_LAYOUT: DropdownLayoutConfig = {
  layout: "left-right",
  columns: {
    count: 2,
    widths: ["w-1/2", "w-1/2"], // 50/50 split
  },
  leftSection: {
    title: "",
    groups: ["named"],
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

  // ========== BORDER & SHADOW PROPERTIES ==========
  radius: {
    layout: "left-right",
    columns: {
      count: 2,
      widths: ["w-1/2", "w-1/2"],
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
      widths: ["w-1/2", "w-1/2"],
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
  borderStyle: COMMON_NAMED_ONLY_LAYOUT,

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
      widths: ["w-1/2", "w-1/2"],
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
    },
  },

  // ========== LAYOUT & DISPLAY ==========
  display: COMMON_NAMED_ONLY_LAYOUT,
  position: COMMON_NAMED_ONLY_LAYOUT,
  cursor: {
    layout: "left-right",
    columns: {
      count: 2,
      widths: ["w-1/2", "w-1/2"],
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

  // ========== FLEXBOX ==========
  flexDirection: COMMON_NAMED_ONLY_LAYOUT,
  alignItems: COMMON_NAMED_ONLY_LAYOUT,
  justifyContent: COMMON_NAMED_ONLY_LAYOUT,

  // ========== TYPOGRAPHY ==========
  fontSize: COMMON_NAMED_ONLY_LAYOUT,
  fontWeight: COMMON_NAMED_ONLY_LAYOUT,
  textAlign: COMMON_NAMED_ONLY_LAYOUT,

  // ========== CLASS EFFECTS (Tailwind transition / transform / filter / backdrop) ==========
  transitionProperty: COMMON_NAMED_OTHER_COLUMN,
  duration: COMMON_NAMED_OTHER_COLUMN,
  delay: COMMON_NAMED_OTHER_COLUMN,
  ease: COMMON_NAMED_OTHER_COLUMN,
  twAnimate: COMMON_NAMED_OTHER_COLUMN,
  scale: COMMON_NAMED_OTHER_COLUMN,
  scaleX: COMMON_NAMED_OTHER_COLUMN,
  scaleY: COMMON_NAMED_OTHER_COLUMN,
  rotate: COMMON_NAMED_OTHER_COLUMN,
  translateX: COMMON_NAMED_OTHER_COLUMN,
  translateY: COMMON_NAMED_OTHER_COLUMN,
  skewX: COMMON_NAMED_OTHER_COLUMN,
  skewY: COMMON_NAMED_OTHER_COLUMN,
  transformOrigin: COMMON_NAMED_OTHER_COLUMN,
  twTransform: COMMON_NAMED_ONLY_LAYOUT,
  blur: COMMON_NAMED_OTHER_COLUMN,
  brightness: COMMON_NAMED_OTHER_COLUMN,
  contrast: COMMON_NAMED_OTHER_COLUMN,
  grayscale: COMMON_NAMED_OTHER_COLUMN,
  hueRotate: COMMON_NAMED_OTHER_COLUMN,
  invert: COMMON_NAMED_OTHER_COLUMN,
  saturate: COMMON_NAMED_OTHER_COLUMN,
  sepia: COMMON_NAMED_OTHER_COLUMN,
  willChange: COMMON_NAMED_OTHER_COLUMN,
  backdropBlur: COMMON_NAMED_OTHER_COLUMN,
  backdropOpacity: COMMON_NAMED_OTHER_COLUMN,
  backdropBrightness: COMMON_NAMED_OTHER_COLUMN,
  backdropContrast: COMMON_NAMED_OTHER_COLUMN,
  backdropGrayscale: COMMON_NAMED_OTHER_COLUMN,
  backdropHueRotate: COMMON_NAMED_OTHER_COLUMN,
  backdropInvert: COMMON_NAMED_OTHER_COLUMN,
  backdropSaturate: COMMON_NAMED_OTHER_COLUMN,
  backdropSepia: COMMON_NAMED_OTHER_COLUMN,
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

  // Default to simple stacked layout if no config found
  return COMMON_NAMED_ONLY_LAYOUT;
};
