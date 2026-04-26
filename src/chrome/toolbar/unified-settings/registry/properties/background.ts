/**
 * Background property definitions — pure data.
 */
import type { PropertyDef } from "../propertyDefs";

export const backgroundProperties: PropertyDef[] = [
  {
    id: "bgColor",
    label: "Color",
    section: "background",
    keywords: ["color", "fill", "bg", "background"],
    input: { type: "color", prefix: "bg" },
    hideKey: "bgColor",
    pinned: true,
    sortOrder: 0,
    inline: true,
  },
  {
    id: "bgImage",
    label: "Image",
    section: "background",
    keywords: ["image", "photo", "picture", "url", "background"],
    input: { type: "custom", component: "BackgroundSettingsInput" },
    sortOrder: 10,
  },
  {
    id: "bgPattern",
    label: "Pattern",
    section: "background",
    keywords: ["pattern", "texture", "dots", "grid", "lines", "noise"],
    input: { type: "custom", component: "PatternInput" },
    hideKey: "pattern",
    sortOrder: 20,
  },
  {
    id: "bgGradient",
    label: "Gradient",
    section: "background",
    keywords: ["gradient", "linear", "radial", "conic", "from", "to", "via"],
    input: { type: "custom", component: "GradientInput" },
    sortOrder: 30,
  },
  {
    id: "bgClip",
    label: "Clip",
    section: "background",
    keywords: ["clip", "text", "border", "padding", "content"],
    input: { type: "tailwind-select", tailwindKey: "bgClip" },
    sortOrder: 100,
  },
  {
    id: "bgBlend",
    label: "Blend",
    section: "background",
    keywords: ["blend", "mode", "multiply", "screen", "overlay"],
    input: { type: "tailwind-select", tailwindKey: "bgBlend" },
    sortOrder: 110,
  },
  {
    id: "mixBlend",
    label: "Mix Blend Mode",
    section: "background",
    keywords: ["mix", "blend", "mode", "multiply", "screen", "overlay"],
    input: { type: "tailwind-select", tailwindKey: "mixBlend" },
    sortOrder: 120,
  },
];
