/**
 * Background property definitions.
 */
import React from "react";
import { LoadingBarSuspenseFallback } from "../../../../primitives/LoadingBar";
import type { PropertyDef } from "../propertyDefs";

const LazyBackgroundSettingsInput = React.lazy(() =>
  import("../../../inputs/color/BackgroundSettingsInput").then(m => ({
    default: m.BackgroundSettingsInput,
  }))
);
const LazyPatternInput = React.lazy(() =>
  import("../../../inputs/color/PatternInput").then(m => ({ default: m.PatternInput }))
);
const LazyGradientInput = React.lazy(() =>
  import("../../../inputs/color/GradientInput").then(m => ({ default: m.GradientInput }))
);

export const backgroundProperties: PropertyDef[] = [
  {
    id: "bgColor",
    label: "Color",
    section: "background",
    keywords: ["color", "fill", "bg", "background"],
    input: { type: "color", prefix: "bg" },
    hideKey: "bgColor",
    sortOrder: 0,
    inline: true,
  },
  {
    id: "bgImage",
    label: "Image",
    section: "background",
    keywords: ["image", "photo", "picture", "url", "background"],
    input: {
      type: "custom",
      component: () => (
        <React.Suspense fallback={<LoadingBarSuspenseFallback />}>
          <LazyBackgroundSettingsInput />
        </React.Suspense>
      ),
    },
    sortOrder: 10,
  },
  {
    id: "bgPattern",
    label: "Pattern",
    section: "background",
    keywords: ["pattern", "texture", "dots", "grid", "lines", "noise"],
    input: {
      type: "custom",
      component: () => (
        <React.Suspense fallback={<LoadingBarSuspenseFallback />}>
          <LazyPatternInput />
        </React.Suspense>
      ),
    },
    hideKey: "pattern",
    sortOrder: 20,
  },
  {
    id: "bgGradient",
    label: "Gradient",
    section: "background",
    keywords: ["gradient", "linear", "radial", "conic", "from", "to", "via"],
    input: {
      type: "custom",
      component: () => (
        <React.Suspense fallback={<LoadingBarSuspenseFallback />}>
          <LazyGradientInput />
        </React.Suspense>
      ),
    },
    sortOrder: 30,
  },

  // ─── Advanced ────────────────────────────────────────────────────
  {
    id: "bgClip",
    label: "Clip",
    section: "background",
    keywords: ["clip", "text", "border", "padding", "content"],
    input: { type: "tailwind-select", tailwindKey: "bgClip" },
    advancedGroup: "background",
    sortOrder: 100,
  },
  {
    id: "bgBlend",
    label: "Blend",
    section: "background",
    keywords: ["blend", "mode", "multiply", "screen", "overlay"],
    input: { type: "tailwind-select", tailwindKey: "bgBlend" },
    advancedGroup: "background",
    sortOrder: 110,
  },
  {
    id: "mixBlend",
    label: "Mix Blend Mode",
    section: "background",
    keywords: ["mix", "blend", "mode", "multiply", "screen", "overlay"],
    input: { type: "tailwind-select", tailwindKey: "mixBlend" },
    advancedGroup: "background",
    sortOrder: 120,
  },
];
