// Default palette colors - single source of truth
// Uses shadcn-compatible names for drop-in React/shadcn compatibility
export const DEFAULT_PALETTE = [
  { name: "Primary", color: "black" },
  { name: "Primary Foreground", color: "white" },
  { name: "Secondary", color: "#f1f5f9" },
  { name: "Secondary Foreground", color: "#1e293b" },
  { name: "Accent", color: "#f1f5f9" },
  { name: "Accent Foreground", color: "#1e293b" },
  { name: "Muted", color: "#64748b" },
  { name: "Muted Foreground", color: "white" },
  { name: "Background", color: "white" },
  { name: "Foreground", color: "#0f0f0f" },
  { name: "Card", color: "#eef2f6" },
  { name: "Card Foreground", color: "#64748b" },
  { name: "Popover", color: "white" },
  { name: "Popover Foreground", color: "#0f0f0f" },
  { name: "Destructive", color: "#ef4444" },
  { name: "Destructive Foreground", color: "white" },
  { name: "Border", color: "#e2e8f0" },
  { name: "Input", color: "#e2e8f0" },
  { name: "Ring", color: "#3b82f6" },
  { name: "Chart 1", color: "#dbeafe" },
  { name: "Chart 2", color: "#bfdbfe" },
  { name: "Chart 3", color: "#93c5fd" },
  { name: "Chart 4", color: "#60a5fa" },
  { name: "Chart 5", color: "#3b82f6" },
  { name: "Sidebar", color: "#f8fafc" },
  { name: "Sidebar Foreground", color: "#0f0f0f" },
  { name: "Sidebar Primary", color: "#1e293b" },
  { name: "Sidebar Primary Foreground", color: "white" },
  { name: "Sidebar Accent", color: "#f1f5f9" },
  { name: "Sidebar Accent Foreground", color: "#1e293b" },
  { name: "Sidebar Border", color: "#e2e8f0" },
  { name: "Sidebar Ring", color: "#3b82f6" },
];

// Default style guide values - single source of truth
export const DEFAULT_STYLE_GUIDE = {
  // Spacing & Layout - using CSS values for CSS vars
  borderRadius: "0.5rem", // rounded-lg = 0.5rem
  buttonPadding: "1.5rem 0.75rem", // Large button padding (x y format)
  containerPadding: "2rem 2rem", // Large container padding (x y format)
  sectionGap: "4rem", // Large section gap
  containerGap: "1.5rem", // Medium container gap
  contentWidth: "80rem", // 2XL content width

  // Typography - heading/body family strings back CSS vars; weights are Tailwind classes on nodes
  headingFont: "font-bold", // Tailwind class for font weight
  headingFontFamily: "Open Sans",
  bodyFont: "font-normal", // Tailwind class for font weight
  bodyFontFamily: "Open Sans",
  shadowStyle: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)", // shadow-lg

  // Form inputs - mixed approach
  inputBorderWidth: "1px", // CSS value for CSS var
  inputBorderColor: "#e2e8f0", // tweakcn border color
  inputBorderRadius: "0.375rem", // CSS value for CSS var (rounded-md = 0.375rem)
  inputPadding: "1rem 1rem", // CSS value for CSS var (px-4 py-2)
  inputBgColor: "white",
  inputTextColor: "#0f0f0f", // tweakcn foreground
  inputPlaceholderColor: "#64748b", // tweakcn muted foreground
  inputFocusRing: "2px", // CSS value for CSS var
  inputFocusRingColor: "#3b82f6", // tweakcn ring color

  // Links - colors only
  linkColor: "#2563eb", // tweakcn-inspired blue
  linkHoverColor: "#1d4ed8", // darker blue for hover
  linkUnderline: "no-underline", // Tailwind class
  linkUnderlineOffset: "underline-offset-2", // Tailwind class
};
