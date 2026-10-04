// ─── CSS Animation Presets ──────────────────────────────────────────────────
//
// Each preset defines:
//   - animateClass: the Tailwind `animate-*` utility class
//   - trigger: "scroll" | "load" | "hover" | "continuous"
//   - label: display name for the UI
//   - group: optgroup category
//   - hoverClass: for hover-type animations, the utility class to apply
//
// Duration, delay, and easing overrides are applied as inline CSS properties
// (animation-duration, animation-delay, animation-timing-function) so the
// user's slider values work without generating extra classes.
//
// Site animations (`site:<slug>`, defined in `theme.animations`) resolve to the
// `ph-a-<slug>` class emitted by `generateSiteAnimationCSS` — see
// `siteAnimations.ts`.

import {
  SITE_ANIMATION_PREFIX,
  siteAnimationClass,
  type SiteAnimation,
} from "./siteAnimationConstants";

export interface CSSAnimationPreset {
  animateClass: string;
  trigger: "scroll" | "load" | "hover" | "continuous";
  label: string;
  group: "Entrance" | "Hover" | "Continuous";
  /** For hover presets, uses a utility class instead of @keyframes */
  hoverClass?: string;
}

export const cssAnimationPresets: Record<string, CSSAnimationPreset> = {
  // ── Entrance (scroll-triggered by default) ─────────────────────────────
  cssFadeIn: {
    animateClass: "animate-css-fade-in",
    trigger: "scroll",
    label: "Fade In",
    group: "Entrance",
  },
  cssFadeUp: {
    animateClass: "animate-css-fade-up",
    trigger: "scroll",
    label: "Fade Up",
    group: "Entrance",
  },
  cssFadeDown: {
    animateClass: "animate-css-fade-down",
    trigger: "scroll",
    label: "Fade Down",
    group: "Entrance",
  },
  cssFadeLeft: {
    animateClass: "animate-css-fade-left",
    trigger: "scroll",
    label: "Fade Left",
    group: "Entrance",
  },
  cssFadeRight: {
    animateClass: "animate-css-fade-right",
    trigger: "scroll",
    label: "Fade Right",
    group: "Entrance",
  },
  cssScaleUp: {
    animateClass: "animate-css-scale-up",
    trigger: "scroll",
    label: "Scale Up",
    group: "Entrance",
  },
  cssBlurIn: {
    animateClass: "animate-css-blur-in",
    trigger: "scroll",
    label: "Blur In",
    group: "Entrance",
  },
  cssSlideUp: {
    animateClass: "animate-css-slide-up",
    trigger: "scroll",
    label: "Slide Up",
    group: "Entrance",
  },
  cssFlipIn: {
    animateClass: "animate-css-flip-in",
    trigger: "scroll",
    label: "Flip In",
    group: "Entrance",
  },
  cssSpring: {
    animateClass: "animate-css-spring",
    trigger: "scroll",
    label: "Spring",
    group: "Entrance",
  },
  cssBounceIn: {
    animateClass: "animate-css-bounce-in",
    trigger: "scroll",
    label: "Bounce In",
    group: "Entrance",
  },
  /** Snappy load entrance: slight overshoot scale (workbench / neubrut cards). */
  cssThudIn: {
    animateClass: "animate-css-thud-in",
    trigger: "load",
    label: "Thud In",
    group: "Entrance",
  },
  /** 3D tile flip with color reveal. Set --tile-flip-from / --tile-flip-to via root.style. Default gray end state matches NYT absent tile (#787c7e). */
  cssTileFlip: {
    animateClass: "animate-css-tile-flip",
    trigger: "load",
    label: "Tile Flip",
    group: "Entrance",
  },

  // ── Hover ─────────────────────────────────────────────────────────────
  cssHoverGrow: {
    animateClass: "",
    hoverClass: "ph-hover-grow",
    trigger: "hover",
    label: "Grow on Hover",
    group: "Hover",
  },
  cssHoverLift: {
    animateClass: "",
    hoverClass: "ph-hover-lift",
    trigger: "hover",
    label: "Lift on Hover",
    group: "Hover",
  },
  cssHoverGlow: {
    animateClass: "",
    hoverClass: "ph-hover-glow",
    trigger: "hover",
    label: "Glow on Hover",
    group: "Hover",
  },
  cssHoverPress: {
    animateClass: "",
    hoverClass: "ph-hover-press",
    trigger: "hover",
    label: "Press",
    group: "Hover",
  },

  // ── Continuous ────────────────────────────────────────────────────────
  cssSpin: {
    animateClass: "animate-css-spin",
    trigger: "continuous",
    label: "Spin",
    group: "Continuous",
  },
  cssPulse: {
    animateClass: "animate-css-pulse",
    trigger: "continuous",
    label: "Pulse",
    group: "Continuous",
  },
  cssWiggle: {
    animateClass: "animate-css-wiggle",
    trigger: "continuous",
    label: "Wiggle",
    group: "Continuous",
  },
  cssMarquee: {
    animateClass: "animate-css-marquee",
    trigger: "continuous",
    label: "Marquee",
    group: "Continuous",
  },
  cssMarqueeSlow: {
    animateClass: "animate-css-marquee-slow",
    trigger: "continuous",
    label: "Marquee Slow",
    group: "Continuous",
  },
  /** Three-phase loop: sequential border spotlight across a horizontal card row (9s). */
  cssChainSpotlight1: {
    animateClass: "animate-css-chain-spotlight-1",
    trigger: "continuous",
    label: "Chain spotlight \u2014 card 1",
    group: "Continuous",
  },
  cssChainSpotlight2: {
    animateClass: "animate-css-chain-spotlight-2",
    trigger: "continuous",
    label: "Chain spotlight \u2014 card 2",
    group: "Continuous",
  },
  cssChainSpotlight3: {
    animateClass: "animate-css-chain-spotlight-3",
    trigger: "continuous",
    label: "Chain spotlight \u2014 card 3",
    group: "Continuous",
  },
  /** Edge labels that sync with chain spotlight cards (9s, same loop). */
  cssChainLabel1: {
    animateClass: "animate-css-chain-label-1",
    trigger: "continuous",
    label: "Chain label \u2014 with card 2",
    group: "Continuous",
  },
  cssChainLabel2: {
    animateClass: "animate-css-chain-label-2",
    trigger: "continuous",
    label: "Chain label \u2014 with card 3",
    group: "Continuous",
  },
  /** Four-phase loop: sequential highlight across a grid of tiles (12s). */
  cssGridSpotlight1: {
    animateClass: "animate-css-grid-spotlight-1",
    trigger: "continuous",
    label: "Grid spotlight \u2014 tile 1",
    group: "Continuous",
  },
  cssGridSpotlight2: {
    animateClass: "animate-css-grid-spotlight-2",
    trigger: "continuous",
    label: "Grid spotlight \u2014 tile 2",
    group: "Continuous",
  },
  cssGridSpotlight3: {
    animateClass: "animate-css-grid-spotlight-3",
    trigger: "continuous",
    label: "Grid spotlight \u2014 tile 3",
    group: "Continuous",
  },
  cssGridSpotlight4: {
    animateClass: "animate-css-grid-spotlight-4",
    trigger: "continuous",
    label: "Grid spotlight \u2014 tile 4",
    group: "Continuous",
  },
};

/** Per-node animation override keys on `props.root` (cleared together on reset). */
export const ANIMATION_PARAM_KEYS = [
  "animationDuration",
  "animationDelay",
  "animationEasing",
  "animationTrigger",
  "animationLoop",
  "animationStagger",
  "animationExit",
];

/** Named easings offered in the editor → CSS timing functions. */
export const EASING_MAP: Record<string, string> = {
  easeOut: "ease-out",
  easeIn: "ease-in",
  easeInOut: "ease-in-out",
  linear: "linear",
  spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
};

/** Editor labels for the EASING_MAP keys, in picker order. */
export const EASING_LABELS: Record<keyof typeof EASING_MAP, string> = {
  easeOut: "Ease out",
  easeIn: "Ease in",
  easeInOut: "Ease in and out",
  linear: "Linear",
  spring: "Spring",
};

/** EASING_MAP key → CSS timing function; anything else passes through as CSS. */
export const toTimingFunction = (easing: string): string => EASING_MAP[easing] || easing;

/** `site:<slug>` — an animation defined in the site's `theme.animations`. */
export const isSiteAnimation = (key?: string): boolean =>
  !!key && key.startsWith(SITE_ANIMATION_PREFIX) && key.length > SITE_ANIMATION_PREFIX.length;

/** Built-in preset or site animation. */
export const isCSSAnimation = (key: string | undefined): boolean =>
  !!key && (key in cssAnimationPresets || isSiteAnimation(key));

/**
 * Display label for an animation key: a site animation's `label` (falling back
 * to its slug when the theme doesn't define it), a built-in preset's label, or
 * the key itself.
 */
export function describeSiteAnimationKey(
  key: string,
  themeAnimations?: Pick<SiteAnimation, "key" | "label">[] | null
): string {
  if (!isSiteAnimation(key)) return cssAnimationPresets[key]?.label || key;
  const slug = key.slice(SITE_ANIMATION_PREFIX.length);
  const match = Array.isArray(themeAnimations)
    ? themeAnimations.find(a => a?.key === slug)
    : undefined;
  return match?.label || slug;
}

/**
 * Built-in preset, or a synthesized one for a `site:` key. Site keys resolve
 * from the key alone — render helpers never see the theme. They always report
 * trigger "scroll" (render adds `ph-anim-scroll`); a load/continuous site
 * animation un-pauses itself via `.ph-a-x.ph-anim-scroll` in the emitted CSS.
 */
function resolvePreset(key: string): CSSAnimationPreset | null {
  const builtin = cssAnimationPresets[key];
  if (builtin) return builtin;
  if (!isSiteAnimation(key)) return null;
  const slug = key.slice(SITE_ANIMATION_PREFIX.length);
  return { animateClass: siteAnimationClass(slug), trigger: "scroll", label: slug, group: "Entrance" };
}

/** `root.animationLoop` → `animation-iteration-count` ("loop" | "once" | count). */
function toIterationCount(iterations: string): string | null {
  if (iterations === "loop") return "infinite";
  if (iterations === "once") return "1";
  return /^\d+(\.\d+)?$/.test(iterations) ? iterations : null;
}

/** Get the CSS classes + inline style overrides for a CSS animation */
export function getCSSAnimationProps(
  animationKey: string,
  overrides?: {
    duration?: number | null;
    delay?: number | null;
    easing?: string | null;
    trigger?: string | null;
    iterations?: string | null;
  }
): { className: string; style: Record<string, string> } {
  const preset = resolvePreset(animationKey);
  if (!preset) return { className: "", style: {} };

  const classes: string[] = [];
  const style: Record<string, string> = {};

  // Determine effective trigger
  const trigger = overrides?.trigger || preset.trigger;

  if (preset.hoverClass) {
    // Hover animations use utility classes, no @keyframes
    classes.push(preset.hoverClass);

    // Duration override maps to transition-duration for hover animations
    if (overrides?.duration != null) {
      style["transition-duration"] = `${overrides.duration}s`;
    }
  } else if (preset.animateClass) {
    classes.push(preset.animateClass);

    // Scroll-triggered: add paused class, IntersectionObserver will unpause
    if (trigger === "scroll") {
      classes.push("ph-anim-scroll");
    }

    // Duration / delay / easing overrides via inline style (camelCase for React)
    if (overrides?.duration != null) {
      style["animationDuration"] = `${overrides.duration}s`;
    }
    if (overrides?.delay != null) {
      style["animationDelay"] = `${overrides.delay}s`;
    }
    if (overrides?.easing) {
      style["animationTimingFunction"] = toTimingFunction(overrides.easing);
    }
    if (overrides?.iterations) {
      const count = toIterationCount(overrides.iterations);
      if (count) style["animationIterationCount"] = count;
    }

    // Continuous trigger override: remove scroll pause
    if (trigger === "continuous" || trigger === "load") {
      const idx = classes.indexOf("ph-anim-scroll");
      if (idx !== -1) classes.splice(idx, 1);
    }
  }

  return { className: classes.join(" "), style };
}

// ─── Scroll Observer (shared singleton for React runtime) ───────────────────
//
// In the editor/preview, we need an IntersectionObserver to add .ph-in-view
// to scroll-triggered CSS animation elements. This lazily creates one global
// observer and provides observe/unobserve for React ref callbacks.

let sharedObserver: IntersectionObserver | null = null;

function getScrollObserver(): IntersectionObserver | null {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) return null;
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("ph-in-view");
            sharedObserver?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
  }
  return sharedObserver;
}

/** Ref callback for scroll-triggered CSS animation elements */
export function scrollAnimRef(el: HTMLElement | null): void {
  if (!el) return;
  const observer = getScrollObserver();
  if (observer) observer.observe(el);
}

