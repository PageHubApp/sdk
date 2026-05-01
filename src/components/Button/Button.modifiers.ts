/** Button — modifier definitions (extracted from Button.craft.tsx). */
import type { ComponentModifier } from "../../define/types";
import { registerModifiers } from "../../define/catalogRegistry";

export const buttonModifiers: ComponentModifier[] = [
// State modifier — canonical "active" styling for any state-bound trigger
// (tab buttons, drawer triggers, accordion summaries, etc.). Bind via
// `props.stateModifiers` referencing this name. Authors override at the
// site level via "Save modifier" to swap classes without touching every
// binding.
{
  name: "tab-active",
  label: "Active",
  category: "State",
  description:
    "Active styling for state-bound triggers — applied when the binding's state condition matches.",
  classes: "border-primary text-primary",
},
{
  name: "dot-active",
  label: "Dot active",
  category: "State",
  description:
    "Carousel / pagination dot indicator — fills with primary and scales up when the bound state matches.",
  classes: "bg-primary scale-125",
},
// Composite patterns — canonical CTA buttons with spatial tokens + consistent height
{
  name: "cta-responsive",
  label: "CTA Responsive",
  category: "Pattern",
  description:
    "Canonical primary CTA — spatial padding, 48px min height, full-width on mobile and auto-width on desktop",
  requires: "btn btn-primary",
  expands: "rounded-box px-space-md py-space-xs min-h-12 font-semibold w-full md:w-auto",
},
{
  name: "cta-outline-responsive",
  label: "CTA Outline",
  category: "Pattern",
  description:
    "Canonical outline CTA — matches CTA Responsive sizing with a base-content border and no fill",
  requires: "btn btn-outline",
  expands:
    "rounded-box px-space-md py-space-xs min-h-12 font-semibold border-base-content/30 text-base-content w-full md:w-auto",
},
// DaisyUI color variants
{
  name: "btn-primary",
  label: "Primary",
  category: "Color",
  description: "Solid fill using the primary brand color",
  exclusive: true,
  requires: "btn",
  removes: ["bg-(--*", "text-(--*", "bg-transparent"],
},
{
  name: "btn-secondary",
  label: "Secondary",
  category: "Color",
  description: "Solid fill using the secondary brand color",
  exclusive: true,
  requires: "btn",
  removes: ["bg-(--*", "text-(--*", "bg-transparent"],
},
{
  name: "btn-accent",
  label: "Accent",
  category: "Color",
  description: "Solid fill using the accent color",
  exclusive: true,
  requires: "btn",
  removes: ["bg-(--*", "text-(--*", "bg-transparent"],
},
{
  name: "btn-neutral",
  label: "Neutral",
  category: "Color",
  description: "Solid fill using the neutral/dark color",
  exclusive: true,
  requires: "btn",
  removes: ["bg-(--*", "text-(--*", "bg-transparent"],
},
{
  name: "btn-info",
  label: "Info",
  category: "Color",
  description: "Solid fill using the info (blue) color",
  exclusive: true,
  requires: "btn",
  removes: ["bg-(--*", "text-(--*", "bg-transparent"],
},
{
  name: "btn-success",
  label: "Success",
  category: "Color",
  description: "Solid fill using the success (green) color",
  exclusive: true,
  requires: "btn",
  removes: ["bg-(--*", "text-(--*", "bg-transparent"],
},
{
  name: "btn-warning",
  label: "Warning",
  category: "Color",
  description: "Solid fill using the warning (yellow/orange) color",
  exclusive: true,
  requires: "btn",
  removes: ["bg-(--*", "text-(--*", "bg-transparent"],
},
{
  name: "btn-error",
  label: "Error",
  category: "Color",
  description: "Solid fill using the error (red) color",
  exclusive: true,
  requires: "btn",
  removes: ["bg-(--*", "text-(--*", "bg-transparent"],
},
// DaisyUI style variants
{
  name: "btn-outline",
  label: "Outline",
  category: "Style",
  description: "Border only, no fill — color fills on hover",
  requires: "btn",
  removes: ["bg-(--*", "text-(--*", "bg-transparent", "border*"],
},
{
  name: "btn-ghost",
  label: "Ghost",
  category: "Style",
  description: "No border or fill — text-only, subtle appearance with hover state",
  requires: "btn",
  removes: ["bg-(--*", "text-(--*", "bg-transparent", "border*"],
},
{
  name: "btn-link",
  label: "Link",
  category: "Style",
  description: "Looks like a hyperlink with no button frame",
  requires: "btn",
  removes: ["bg-(--*", "text-(--*", "bg-transparent", "border*"],
},
{
  name: "btn-soft",
  label: "Soft",
  category: "Style",
  description: "Soft tinted fill at reduced opacity — gentler than solid",
  requires: "btn",
  removes: ["bg-(--*", "text-(--*", "bg-transparent", "border*"],
},
{
  name: "btn-dash",
  label: "Dash",
  category: "Style",
  description: "Dashed border instead of solid",
  requires: "btn",
  removes: ["bg-(--*", "text-(--*", "bg-transparent", "border*"],
},
// DaisyUI size variants
{ name: "btn-xs", label: "Tiny", category: "Size", exclusive: true, requires: "btn" },
{ name: "btn-sm", label: "Small", category: "Size", exclusive: true, requires: "btn" },
{ name: "btn-md", label: "Medium", category: "Size", exclusive: true, requires: "btn" },
{ name: "btn-lg", label: "Large", category: "Size", exclusive: true, requires: "btn" },
{ name: "btn-xl", label: "XL", category: "Size", exclusive: true, requires: "btn" },
{
  name: "btn-wide",
  label: "Wide",
  category: "Size",
  description: "Fixed wide width — good for consistent button widths in a row",
  exclusive: true,
  requires: "btn",
},
{
  name: "btn-block",
  label: "Full Width",
  category: "Size",
  description: "Stretches to fill its parent container",
  exclusive: true,
  requires: "btn",
},
// DaisyUI shape variants
{
  name: "btn-circle",
  label: "Circle",
  category: "Shape",
  description: "Circular shape — best for icon-only buttons",
  exclusive: true,
  requires: "btn",
},
{
  name: "btn-square",
  label: "Square",
  category: "Shape",
  description: "Square shape — best for icon-only buttons",
  exclusive: true,
  requires: "btn",
},
// State
{
  name: "btn-disabled",
  label: "Disabled",
  category: "State",
  description: "Visually muted and non-interactive",
  requires: "btn",
  peerInherit: false,
},
{
  name: "loading",
  label: "Loading",
  category: "State",
  description: "Shows a loading spinner inside the button",
  requires: "btn",
  peerInherit: false,
},
];

registerModifiers("Button", buttonModifiers);
