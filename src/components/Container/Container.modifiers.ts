/** Container — modifier definitions (extracted from Container.craft.tsx). */
import type { ComponentModifier } from "../../define/types";
import { registerModifiers } from "../../define/catalogRegistry";

export const containerModifiers: ComponentModifier[] = [
// Composite patterns (real CSS classes via @utility in @pagehub/daisyui-spatial)
// DaisyUI component classes go in `requires` — auto-added alongside the modifier.
{
  name: "section-wrapper",
  label: "Section",
  category: "Pattern",
  description: "Full-width section with standard vertical padding and max-width content area",
},
{
  name: "section-wrapper-dark",
  label: "Section Dark",
  category: "Pattern",
  description: "Full-width dark section — dark background with light text, standard padding",
},
{
  name: "card-surface",
  label: "Card Surface",
  category: "Pattern",
  description: "Raised card with border, shadow, rounded corners, and padding",
  requires: "card",
},
{
  name: "icon-row",
  label: "Icon Row",
  category: "Pattern",
  description: "Horizontal flex row with gap — good for icon + label pairs",
},
{
  name: "content-col",
  label: "Content Column",
  category: "Pattern",
  description: "Vertical flex column with gap — good for stacked headings, copy, and CTAs",
},
{
  name: "hero-content-centered",
  label: "Hero Content",
  category: "Pattern",
  description:
    "Centered hero content with max-width constraint — use inside a hero container",
  requires: "hero-content",
},
// DaisyUI component roles
{
  name: "card",
  label: "Card",
  category: "DaisyUI",
  description: "DaisyUI card — adds shadow, border-radius, and overflow clipping",
},
{
  name: "card-body",
  label: "Card Body",
  category: "DaisyUI",
  description: "Inner padding area of a DaisyUI card",
},
{
  name: "card-compact",
  label: "Compact Card",
  category: "DaisyUI",
  description: "Card with reduced padding — tighter than the default card-body",
},
{
  name: "hero",
  label: "Hero",
  category: "DaisyUI",
  description: "DaisyUI hero — full-width flex container with centered content layout",
},
{
  name: "hero-content",
  label: "Hero Content",
  category: "DaisyUI",
  description: "Inner content wrapper for a hero — constrains width and centers children",
},
{
  name: "hero-overlay",
  label: "Hero Overlay",
  category: "DaisyUI",
  description:
    "Dark semi-transparent overlay — place over a background image to improve text contrast",
},
{
  name: "navbar",
  label: "Navbar",
  category: "DaisyUI",
  description: "DaisyUI navbar — horizontal bar with padding and flex layout for nav items",
},
{
  name: "drawer",
  label: "Drawer",
  category: "DaisyUI",
  description: "DaisyUI drawer root — used for slide-in side panel layouts",
},
{
  name: "modal-box",
  label: "Modal Box",
  category: "DaisyUI",
  description: "DaisyUI modal content box — centered dialog with shadow and padding",
},
{
  name: "collapse",
  label: "Collapse",
  category: "DaisyUI",
  description: "DaisyUI collapsible container — children toggle open/closed",
},
{
  name: "collapse-title",
  label: "Collapse Title",
  category: "DaisyUI",
  description: "Clickable title row that toggles the collapse open or closed",
},
{
  name: "collapse-content",
  label: "Collapse Content",
  category: "DaisyUI",
  description: "Hidden content area that expands when the collapse is open",
},
// Spacing (spatial tokens)
{
  name: "p-space-xs",
  label: "XS Padding",
  category: "Padding",
  description: "Extra-small padding on all sides using the density-aware spatial scale",
},
{
  name: "p-space-sm",
  label: "SM Padding",
  category: "Padding",
  description: "Small padding on all sides using the density-aware spatial scale",
},
{
  name: "p-space-md",
  label: "MD Padding",
  category: "Padding",
  description: "Medium padding on all sides using the density-aware spatial scale",
},
{
  name: "p-space-lg",
  label: "LG Padding",
  category: "Padding",
  description: "Large padding on all sides using the density-aware spatial scale",
},
{
  name: "p-space-xl",
  label: "XL Padding",
  category: "Padding",
  description: "Extra-large padding on all sides using the density-aware spatial scale",
},
// ── Animation patterns ────────────────────────────────────────────────
// Express native <details> open/close transitions as Tailwind 4
// arbitrary-variant utilities. Zero custom CSS — every class compiles
// through the standard SSR Tailwind pipeline. Edit / clone via the
// Modifiers Modal to author per-site variants.
// `&` is the wrapper div — `::details-content` only exists on <details>,
// so we need the descendant combinator (`_`) to target child <details>
// elements: `[&_details::details-content]:…`.
{
  name: "accordion-slide",
  label: "Slide",
  category: "Accordion",
  exclusive: true,
  renderAs: "patterns",
  description: "Animates height on <details> open/close — pure CSS, no JS",
  classes:
    "[&_details]:[interpolate-size:allow-keywords] " +
    "[&_details::details-content]:h-0 " +
    "[&_details::details-content]:overflow-clip " +
    "[&_details::details-content]:transition-all " +
    "[&_details::details-content]:duration-300 " +
    "[&_details::details-content]:ease-out " +
    "[&_details[open]::details-content]:h-auto " +
    "[&_details[open]::details-content]:starting:h-0 " +
    "[&_details::details-content]:[transition-behavior:allow-discrete]",
},
{
  name: "accordion-fade",
  label: "Fade",
  category: "Accordion",
  exclusive: true,
  renderAs: "patterns",
  description: "Animates opacity + height on <details> open/close",
  classes:
    "[&_details]:[interpolate-size:allow-keywords] " +
    "[&_details::details-content]:h-0 " +
    "[&_details::details-content]:opacity-0 " +
    "[&_details::details-content]:overflow-clip " +
    "[&_details::details-content]:transition-all " +
    "[&_details::details-content]:duration-300 " +
    "[&_details::details-content]:ease-out " +
    "[&_details[open]::details-content]:h-auto " +
    "[&_details[open]::details-content]:opacity-100 " +
    "[&_details[open]::details-content]:starting:h-0 " +
    "[&_details[open]::details-content]:starting:opacity-0 " +
    "[&_details::details-content]:[transition-behavior:allow-discrete]",
},
{
  name: "accordion-slide-fade",
  label: "Slide + Fade",
  category: "Accordion",
  exclusive: true,
  renderAs: "patterns",
  description: "Combined opacity + height animation (default Accordion preset)",
  classes:
    "[&_details]:[interpolate-size:allow-keywords] " +
    "[&_details::details-content]:h-0 " +
    "[&_details::details-content]:opacity-0 " +
    "[&_details::details-content]:overflow-clip " +
    "[&_details::details-content]:transition-all " +
    "[&_details::details-content]:duration-300 " +
    "[&_details::details-content]:ease-out " +
    "[&_details[open]::details-content]:h-auto " +
    "[&_details[open]::details-content]:opacity-100 " +
    "[&_details[open]::details-content]:starting:h-0 " +
    "[&_details[open]::details-content]:starting:opacity-0 " +
    "[&_details::details-content]:[transition-behavior:allow-discrete]",
},
];

registerModifiers("Container", containerModifiers);
