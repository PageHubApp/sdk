// Default Tailwind v4 breakpoints (px). These map to the rem values Tailwind
// emits in compiled CSS: 40rem / 48rem / 64rem / 80rem / 96rem (16px base).
export const DEFAULT_BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type BreakpointKey = keyof typeof DEFAULT_BREAKPOINTS;

// Default palette colors - single source of truth
// Uses DaisyUI 5-compatible names: primary/secondary/accent/neutral/base-*/error/info/success/warning
export const DEFAULT_PALETTE = [
  { name: "Primary", color: "#0a0a0a" },
  { name: "Primary Content", color: "#fafafa" },
  { name: "Secondary", color: "#f5f5f5" },
  { name: "Secondary Content", color: "#171717" },
  { name: "Accent", color: "#0a0a0a" },
  { name: "Accent Content", color: "#fafafa" },
  { name: "Neutral", color: "#f5f5f5" },
  { name: "Neutral Content", color: "#525252" },
  { name: "Base 100", color: "#ffffff" },
  { name: "Base 200", color: "#fafafa" },
  { name: "Base 300", color: "#e5e5e5" },
  { name: "Base Content", color: "#0a0a0a" },
  { name: "Error", color: "#ef4444" },
  { name: "Error Content", color: "#ffffff" },
  { name: "Info", color: "#3b82f6" },
  { name: "Info Content", color: "#ffffff" },
  { name: "Success", color: "#22c55e" },
  { name: "Success Content", color: "#ffffff" },
  { name: "Warning", color: "#f59e0b" },
  { name: "Warning Content", color: "#171717" },
  { name: "Ring", color: "#0a0a0a" },
];

// Default dark palette — only core semantic tokens that change between light/dark.
export const DEFAULT_DARK_PALETTE = [
  { name: "Primary", color: "#818cf8" },
  { name: "Primary Content", color: "#0f0f1a" },
  { name: "Secondary", color: "#1e1b4b" },
  { name: "Secondary Content", color: "#e0e7ff" },
  { name: "Accent", color: "#22d3ee" },
  { name: "Accent Content", color: "#0f172a" },
  { name: "Neutral", color: "#1e293b" },
  { name: "Neutral Content", color: "#94a3b8" },
  { name: "Base 100", color: "#0f172a" },
  { name: "Base 200", color: "#1e293b" },
  { name: "Base 300", color: "#334155" },
  { name: "Base Content", color: "#f1f5f9" },
  { name: "Error", color: "#f87171" },
  { name: "Error Content", color: "#0f0f0f" },
  { name: "Info", color: "#60a5fa" },
  { name: "Info Content", color: "#0f0f0f" },
  { name: "Success", color: "#4ade80" },
  { name: "Success Content", color: "#0f0f0f" },
  { name: "Warning", color: "#fbbf24" },
  { name: "Warning Content", color: "#0f0f0f" },
  { name: "Ring", color: "#818cf8" },
];

/** Density slider steps — single source of truth for both editor and preview UIs */
export const DENSITY_STEPS = [
  { value: "0.25", label: "Minimal" },
  { value: "0.5", label: "Tight" },
  { value: "0.65", label: "Compact" },
  { value: "0.8", label: "Snug" },
  { value: "1", label: "Default" },
  { value: "1.25", label: "Relaxed" },
  { value: "1.5", label: "Airy" },
  { value: "1.75", label: "Spacious" },
  { value: "2.5", label: "Ultra" },
];

// Default style guide values - single source of truth
export const DEFAULT_STYLE_GUIDE = {
  // Radius & Sizing (DaisyUI 5-aligned)
  radiusBox: "0.5rem", // → --radius-box (cards, containers, modals, buttons)
  radiusField: "0.375rem", // → --radius-field (inputs, textareas, selects)
  radiusSelector: "0.5rem", // → --radius-selector (checkboxes, radios, toggles)
  sizeField: "0.25rem", // → --size-field (input/button height base)
  sizeSelector: "0.25rem", // → --size-selector (checkbox/radio size base)
  depth: "1", // → --depth (subtle 3D/shadow effect: 0 = flat, 1 = raised)
  noise: "0", // → --noise (textured noise overlay: 0 = off, 1 = on)
  buttonPadding: "1.5rem 0.75rem", // Large button padding (x y format)
  containerPadding: "2rem 2rem", // Large container padding (x y format)
  sectionGap: "4rem", // Large section gap
  containerGap: "1.5rem", // Medium container gap
  contentWidth: "80rem", // 2XL content width

  // Spatial scale — 5 fluid tiers (doubling scale, damped top)
  // Each tier is a clamp() that scales fluidly from 375px to 1440px viewport
  spaceXs: "clamp(0.375rem, 0.25rem + 0.39vw, 0.5rem)", // 6px → 8px — micro: icon gaps, tag padding
  spaceSm: "clamp(0.75rem, 0.5rem + 0.75vw, 1rem)", // 12px → 16px — element: card items, form fields
  spaceMd: "clamp(1.5rem, 1rem + 1.5vw, 2rem)", // 24px → 32px — content: heading-to-grid, columns
  spaceLg: "clamp(2.5rem, 1.25rem + 3.75vw, 4rem)", // 40px → 64px — section: standard block padding
  spaceXl: "clamp(3.5rem, 1.75rem + 5.25vw, 6rem)", // 56px → 96px — statement: heroes, full-bleed CTAs
  spacingDensity: "1", // Master multiplier: 0.75 (compact) → 1.25 (airy)

  // Heading/body fonts now live in theme.typography[] (see DEFAULT_CUSTOM_FONTS in useDesignSystem.ts)
  shadowStyle: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)", // shadow-lg

  // Form inputs
  border: "1px", // → --border (DaisyUI 5: component border width)
  inputBorderColor: "#e2e8f0", // default border color
  inputPadding: "1rem 1rem", // CSS value for CSS var (px-4 py-2)
  inputBgColor: "white",
  inputTextColor: "#0f0f0f", // base-content
  inputPlaceholderColor: "#64748b", // neutral-content
  inputFocusRing: "2px", // CSS value for CSS var
  inputFocusRingColor: "#3b82f6", // ring color

  // Links - colors only
  linkColor: "#2563eb", // default link blue
  linkHoverColor: "#1d4ed8", // darker blue for hover
  linkUnderline: "no-underline", // Tailwind class
  linkUnderlineOffset: "underline-offset-2", // Tailwind class
};
