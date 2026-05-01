/** Text — modifiers extracted from Text.craft.tsx. */
import type { ComponentModifier } from "../../define/types";
import { registerModifiers } from "../../define/catalogRegistry";

export const textModifiers: ComponentModifier[] = [
      // Composite patterns (real CSS classes via @utility in daisyui-spatial)
      {
        name: "body-text",
        label: "Body",
        category: "Pattern",
        description:
          "Standard paragraph text — comfortable reading size, normal weight, relaxed line height",
      },
      {
        name: "section-heading",
        label: "Heading",
        category: "Pattern",
        description:
          "Bold section heading — typically h2 size with heading font and tight line height",
      },
      {
        name: "eyebrow",
        label: "Eyebrow",
        category: "Pattern",
        description:
          "Small uppercase label above a heading — wide letter spacing, muted color, small size",
      },
      {
        name: "subhead",
        label: "Subhead",
        category: "Pattern",
        description:
          "Secondary heading below the main title — larger than body but smaller than the heading",
      },
      // Style
      {
        name: "uppercase",
        label: "Uppercase",
        category: "Style",
        description: "Transforms all text to ALL CAPS",
      },
      { name: "italic", label: "Italic", category: "Style", description: "Italicizes the text" },
      {
        name: "tracking-wide",
        label: "Wide Track",
        category: "Style",
        description: "Slightly increased letter spacing — good for subheadings",
      },
      {
        name: "tracking-widest",
        label: "Widest Track",
        category: "Style",
        description: "Very wide letter spacing — classic eyebrow/label treatment",
      },
      {
        name: "leading-tight",
        label: "Tight Lines",
        category: "Style",
        description: "Tighter line height — good for large headings",
      },
      {
        name: "leading-relaxed",
        label: "Relaxed Lines",
        category: "Style",
        description: "Looser line height — improves readability for body copy",
      },
      // DaisyUI
      {
        name: "link",
        label: "Link",
        category: "DaisyUI",
        description: "Styles the text as a hyperlink with underline",
      },
      {
        name: "link-primary",
        label: "Link Primary",
        category: "DaisyUI",
        description: "Link styled in the primary brand color",
      },
      {
        name: "link-hover",
        label: "Link Hover",
        category: "DaisyUI",
        description: "Underline appears only on hover — cleaner look for nav links",
      },
      // Color
      {
        name: "text-primary",
        label: "Primary",
        category: "Color",
        description: "Primary brand color",
        exclusive: true,
      },
      {
        name: "text-accent",
        label: "Accent",
        category: "Color",
        description: "Accent color — good for highlights and callouts",
        exclusive: true,
      },
      {
        name: "text-neutral-content",
        label: "Muted",
        category: "Color",
        description: "Muted secondary text — only use on bg-neutral surfaces",
        exclusive: true,
      },
      {
        name: "opacity-70",
        label: "Faded",
        category: "Color",
        description: "Reduces opacity to 70% — softens text without changing color",
        exclusive: true,
      },
      // Font family
      {
        name: "font-heading",
        label: "Heading Font",
        category: "Font",
        description: "Uses the heading typeface defined in the design system",
        exclusive: true,
      },
      {
        name: "font-body",
        label: "Body Font",
        category: "Font",
        description: "Uses the body typeface defined in the design system",
        exclusive: true,
      },
];

registerModifiers("Text", textModifiers);
