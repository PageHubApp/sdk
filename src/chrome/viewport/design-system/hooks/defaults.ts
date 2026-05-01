import type { CustomFont } from "./types";

// Heading and Body are reserved-name tokens that drive --heading-font-family /
// --body-font-family CSS vars (which power Tailwind `font-heading` / `font-body`).
// Their fontSize/lineHeight/etc. are mostly cosmetic — nodes use Tailwind size
// classes (text-3xl, etc.) by default. Migration ports old styleGuide.headingFont*
// / bodyFont* scalars into entries here; new sites get these defaults.
export const DEFAULT_CUSTOM_FONTS: CustomFont[] = [
  {
    name: "Heading",
    fontFamily: "Open Sans",
    fontSize: "1.5rem",
    fontWeight: "700",
    lineHeight: "1.2",
    letterSpacing: "normal",
    textTransform: "none",
  },
  {
    name: "Body",
    fontFamily: "Open Sans",
    fontSize: "1rem",
    fontWeight: "400",
    lineHeight: "1.5",
    letterSpacing: "normal",
    textTransform: "none",
  },
  {
    name: "Caption",
    fontFamily: "Inter",
    fontSize: "0.875rem",
    fontWeight: "400",
    lineHeight: "1.4",
    letterSpacing: "normal",
    textTransform: "none",
  },
];
