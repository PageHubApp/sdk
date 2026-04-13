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
  /** Three-phase loop for a horizontal “causality” card row (use one preset per card in order). */
  cssWohChain1: {
    animateClass: "animate-css-woh-chain-1",
    trigger: "continuous",
    label: "Chain spotlight — card 1",
    group: "Continuous",
  },
  cssWohChain2: {
    animateClass: "animate-css-woh-chain-2",
    trigger: "continuous",
    label: "Chain spotlight — card 2",
    group: "Continuous",
  },
  cssWohChain3: {
    animateClass: "animate-css-woh-chain-3",
    trigger: "continuous",
    label: "Chain spotlight — card 3",
    group: "Continuous",
  },
  /** Four-phase loop for verb tiles (grammar row). */
  cssWohVerb1: {
    animateClass: "animate-css-woh-verb-1",
    trigger: "continuous",
    label: "Verb spotlight — tile 1",
    group: "Continuous",
  },
  cssWohVerb2: {
    animateClass: "animate-css-woh-verb-2",
    trigger: "continuous",
    label: "Verb spotlight — tile 2",
    group: "Continuous",
  },
  cssWohVerb3: {
    animateClass: "animate-css-woh-verb-3",
    trigger: "continuous",
    label: "Verb spotlight — tile 3",
    group: "Continuous",
  },
  cssWohVerb4: {
    animateClass: "animate-css-woh-verb-4",
    trigger: "continuous",
    label: "Verb spotlight — tile 4",
    group: "Continuous",
  },
};

/** Check if an animation key is a CSS preset (starts with "css") */
export const isCSSAnimation = (key: string | undefined): boolean =>
  !!key && key in cssAnimationPresets;

/** Get the CSS classes + inline style overrides for a CSS animation */
export function getCSSAnimationProps(
  animationKey: string,
  overrides?: {
    duration?: number | null;
    delay?: number | null;
    easing?: string | null;
    trigger?: string | null;
  }
): { className: string; style: Record<string, string> } {
  const preset = cssAnimationPresets[animationKey];
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

    // Duration / delay / easing overrides via inline style
    if (overrides?.duration != null) {
      style["animation-duration"] = `${overrides.duration}s`;
    }
    if (overrides?.delay != null) {
      style["animation-delay"] = `${overrides.delay}s`;
    }
    if (overrides?.easing) {
      const easingMap: Record<string, string> = {
        easeOut: "ease-out",
        easeIn: "ease-in",
        easeInOut: "ease-in-out",
        linear: "linear",
        spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      };
      style["animation-timing-function"] = easingMap[overrides.easing] || overrides.easing;
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

// Legacy export — kept for backwards compat with AnimationsInput
export const animationClasses: any[] = [];
