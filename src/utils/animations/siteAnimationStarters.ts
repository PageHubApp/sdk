// ─── Site animation starters ───────────────────────────────────────────────
//
// "Start from a built-in" in the site animation editor copies one of these
// into the site's `theme.animations`, where the author tweaks it.

import type { SiteAnimation } from "./siteAnimationConstants";

export const SITE_ANIMATION_STARTERS: SiteAnimation[] = [
  {
    key: "fade-up",
    label: "Fade Up",
    trigger: "scroll",
    duration: 0.6,
    easing: "easeOut",
    iterations: 1,
    keyframes: [
      { at: 0, style: { opacity: "0", transform: "translateY(24px)" } },
      { at: 100, style: { opacity: "1", transform: "translateY(0)" } },
    ],
  },
  {
    key: "scale-up",
    label: "Scale Up",
    trigger: "scroll",
    duration: 0.5,
    easing: "easeOut",
    iterations: 1,
    keyframes: [
      { at: 0, style: { opacity: "0", transform: "scale(0.92)" } },
      { at: 100, style: { opacity: "1", transform: "scale(1)" } },
    ],
  },
  {
    // Reveals left → right; works on any element (lines, rules, text).
    key: "line-draw",
    label: "Line Draw",
    trigger: "scroll",
    duration: 1.2,
    easing: "easeInOut",
    iterations: 1,
    keyframes: [
      { at: 0, style: { "clip-path": "inset(0 100% 0 0)" } },
      { at: 100, style: { "clip-path": "inset(0 0 0 0)" } },
    ],
  },
  {
    // Grows a bar from its transform origin. `transform-origin` isn't
    // animatable, so the node carries `origin-left` in its className.
    key: "fill",
    label: "Fill",
    trigger: "scroll",
    duration: 1,
    easing: "easeOut",
    iterations: 1,
    keyframes: [
      { at: 0, style: { transform: "scaleX(0)" } },
      { at: 100, style: { transform: "scaleX(1)" } },
    ],
  },
  {
    // Marching dashes: the node's background is a repeating gradient whose
    // period matches the 24px shift, e.g.
    // `bg-[repeating-linear-gradient(90deg,var(--primary)_0_12px,transparent_12px_24px)]`.
    key: "march",
    label: "March",
    trigger: "continuous",
    duration: 1,
    easing: "linear",
    iterations: "infinite",
    keyframes: [
      { at: 0, style: { "background-position": "0 0" } },
      { at: 100, style: { "background-position": "24px 0" } },
    ],
  },
  {
    // A pulse of light travelling along a track (parent needs overflow-hidden).
    key: "flow",
    label: "Flow",
    trigger: "continuous",
    duration: 2.4,
    easing: "linear",
    iterations: "infinite",
    keyframes: [
      { at: 0, style: { transform: "translateX(-100%)", opacity: "0" } },
      { at: 15, style: { opacity: "1" } },
      { at: 85, style: { opacity: "1" } },
      { at: 100, style: { transform: "translateX(100%)", opacity: "0" } },
    ],
  },
  {
    key: "pulse",
    label: "Pulse",
    trigger: "continuous",
    duration: 2,
    easing: "easeInOut",
    iterations: "infinite",
    keyframes: [
      { at: 0, style: { opacity: "1", transform: "scale(1)" } },
      { at: 50, style: { opacity: "0.6", transform: "scale(1.05)" } },
      { at: 100, style: { opacity: "1", transform: "scale(1)" } },
    ],
  },
];
