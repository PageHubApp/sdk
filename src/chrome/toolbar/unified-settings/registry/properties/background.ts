/**
 * Background property definitions — pure data.
 */
import React from "react";
import { TbBlendMode } from "react-icons/tb";
import type { PropertyDef } from "../propertyDefs";

export const backgroundProperties: PropertyDef[] = [
  {
    id: "bgColor",
    label: "Color",
    section: "background",
    keywords: ["color", "fill", "bg", "background"],
    input: { type: "color", prefix: "bg" },
    hideKey: "bgColor",
    pinned: false,
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
    propKey: "gradients",
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
    input: { type: "universal", tailwindKey: "bgClip" },
    sortOrder: 100,
  },
  {
    id: "blend",
    label: "Blend",
    section: "background",
    keywords: ["blend", "mode", "multiply", "screen", "overlay", "mix", "background"],
    sortOrder: 110,
    input: {
      type: "bundle",
      icon: React.createElement(TbBlendMode, { className: "size-3.5" }),
      properties: [
        {
          id: "bgBlend",
          label: "Background",
          section: "background",
          keywords: ["blend", "mode", "multiply", "screen", "overlay"],
          input: { type: "universal", tailwindKey: "bgBlend" },
          inline: true,
        },
        {
          id: "mixBlend",
          label: "Mix",
          section: "background",
          keywords: ["mix", "blend", "mode", "multiply", "screen", "overlay"],
          input: { type: "universal", tailwindKey: "mixBlend" },
          inline: true,
        },
      ],
    },
  },
];
