/**
 * Image Settings property definitions — pure data.
 *
 * These render in the cog popover off the Background image chip
 * (see `BackgroundImageSettingsBody` → `<PropertySection sectionId="image-settings" />`).
 * The section is `searchOnly: true` so it doesn't surface in the main
 * inspector — registry-driven AccordionAddMenu provides the `+ Add Setting`
 * picker; PropertyRenderer dispatches each row to the standard input
 * primitives (color, checkbox, select, universal-tailwind).
 */
import type { PropertyDef } from "../propertyDefs";

export const imageSettingsProperties: PropertyDef[] = [
  {
    id: "imgLoadingColor",
    label: "Loading Color",
    section: "image-settings",
    keywords: ["loading", "color", "placeholder"],
    propKey: "background.placeholder",
    propType: "component",
    input: { type: "color", prefix: "" },
    sortOrder: 10,
    inline: true,
  },
  {
    id: "imgPreload",
    label: "Preload",
    section: "image-settings",
    keywords: ["preload", "priority", "fetch"],
    propKey: "background.priority",
    propType: "component",
    input: { type: "checkbox", on: "priority" },
    sortOrder: 20,
    inline: true,
  },
  {
    id: "imgLazyLoad",
    label: "Lazy Load",
    section: "image-settings",
    keywords: ["lazy", "loading", "defer"],
    propKey: "background.lazy",
    propType: "component",
    input: { type: "checkbox", on: "lazy" },
    sortOrder: 30,
    inline: true,
  },
  {
    id: "imgFetchPriority",
    label: "Fetch Priority",
    section: "image-settings",
    keywords: ["fetch", "priority", "low", "high", "auto"],
    propKey: "background.fetchPriority",
    propType: "component",
    input: {
      type: "select",
      options: [
        { label: "Auto", value: "" },
        { label: "Low", value: "low" },
        { label: "High", value: "high" },
      ],
    },
    sortOrder: 40,
    inline: true,
  },
  {
    id: "backgroundRepeat",
    label: "Repeat",
    section: "image-settings",
    keywords: ["repeat", "tile", "no-repeat"],
    input: { type: "universal", tailwindKey: "backgroundRepeat" },
    sortOrder: 50,
    inline: true,
  },
  {
    id: "backgroundSize",
    label: "Size",
    section: "image-settings",
    keywords: ["size", "cover", "contain", "auto"],
    input: { type: "universal", tailwindKey: "backgroundSize" },
    sortOrder: 60,
    inline: true,
  },
  {
    id: "backgroundOrigin",
    label: "Origin",
    section: "image-settings",
    keywords: ["origin", "border", "padding", "content"],
    input: { type: "universal", tailwindKey: "backgroundOrigin" },
    sortOrder: 70,
    inline: true,
  },
  {
    id: "backgroundPosition",
    label: "Position",
    section: "image-settings",
    keywords: ["position", "top", "bottom", "left", "right", "center"],
    input: { type: "universal", tailwindKey: "backgroundPosition" },
    sortOrder: 80,
    inline: true,
  },
  {
    id: "backgroundAttachment",
    label: "Attachment",
    section: "image-settings",
    keywords: ["attachment", "fixed", "scroll", "local"],
    input: { type: "universal", tailwindKey: "backgroundAttachment" },
    sortOrder: 90,
    inline: true,
  },
];
