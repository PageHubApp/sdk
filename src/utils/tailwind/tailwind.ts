/**
 * Tailwind utilities — re-exports style data from ./tailwind-styles
 * and adds React/CraftJS-dependent helpers (applyAnimation, CSStoObj, etc.).
 *
 * Components should import from here. Pure/static contexts (static-html, MCP)
 * should import from ./tailwind-styles directly to avoid pulling in React.
 */

import parse from "style-to-object";
import { BaseSelectorProps } from "../../components/selectors";
import { getFontFromComp, loadCombinedFonts } from "../lib";
import { isCSSAnimation, getCSSAnimationProps, scrollAnimRef } from "../animations";

// ─── Re-export everything from the pure module ─────────────────────────────

export {
    AllStyles, AllStylesSet,
    classNameToVar, fonts,
    getColorPalette, isValidTailwindClass,
    PREFIX_ENTRIES, PREFIX_TO_KEY,
    RootClassGenProps, TailwindStyles
} from "./tailwind-styles";

// ─── CSStoObj ───────────────────────────────────────────────────────────────

/** `style-to-object` yields kebab-case keys; React `style` expects camelCase. Keeps `--*` custom properties as-is. */
function cssKeysToReactStyle(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const out = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (k.startsWith("--")) {
      out[k] = v;
      continue;
    }
    const reactKey = k
      .replace(/^-ms-/, "ms-")
      .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[reactKey] = v;
  }
  return out;
}

export const CSStoObj = pro => {
  try {
    const raw = typeof pro === "string" ? parse(pro) : pro;
    if (raw == null || typeof raw !== "object") return null;
    return cssKeysToReactStyle(raw);
  } catch (e) {
    return null;
  }
};

// ─── Animations ─────────────────────────────────────────────────────────────

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const animations = {
  // ── Existing presets ───────────────────────────────────────────────────

  tween: {
    animate: { rotate: 360 },
    transition: { duration: 3 },
    exit: { rotate: 360 },
  },

  spring: {
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true },
    transition: { duration: 0.5 },
    variants: {
      visible: { opacity: 1, scale: 1 },
      hidden: { opacity: 0, scale: 0 },
    },
  },
  hoverGrow: {
    whileHover: {
      scale: 1.1,
      transition: { duration: 1 },
    },
    whileTap: { scale: 0.9 },
  },
  abounce: {
    initial: { opacity: 0, delay: 2 },
    animate: { opacity: 1 },
    exit: { opacity: 0, left: -200 },
    transition: { duration: 2 },
  },
  bounce: {
    initial: {
      x: 0,
    },
    enter: {
      opacity: 1,
      x: 0,
      transition: {
        delay: 2,
        duration: 0.5,
        ease: [0.61, 1, 0.88, 1],
        scale: {
          type: "spring",
          damping: 5,
          stiffness: 100,
          restDelta: 0.001,
        },
      },
    },
    exit: {
      x: 1000,
      transition: {
        when: "afterChildren",
        type: "spring",
        duration: 0.5,
        ease: [0.61, 1, 0.88, 1],
        scale: {
          type: "spring",
          damping: 5,
          stiffness: 100,
          restDelta: 0.001,
        },
      },
    },
  },

  // ── Entrance (scroll-triggered) ────────────────────────────────────────

  fadeIn: {
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true },
    transition: { duration: 0.6, ease: "easeOut" },
    variants: {
      visible: { opacity: 1 },
      hidden: { opacity: 0 },
    },
  },
  fadeUp: {
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true },
    transition: { duration: 0.6, ease: "easeOut" },
    variants: {
      visible: { opacity: 1, y: 0 },
      hidden: { opacity: 0, y: 40 },
    },
  },
  fadeDown: {
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true },
    transition: { duration: 0.6, ease: "easeOut" },
    variants: {
      visible: { opacity: 1, y: 0 },
      hidden: { opacity: 0, y: -40 },
    },
  },
  fadeLeft: {
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true },
    transition: { duration: 0.6, ease: "easeOut" },
    variants: {
      visible: { opacity: 1, x: 0 },
      hidden: { opacity: 0, x: 40 },
    },
  },
  fadeRight: {
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true },
    transition: { duration: 0.6, ease: "easeOut" },
    variants: {
      visible: { opacity: 1, x: 0 },
      hidden: { opacity: 0, x: -40 },
    },
  },
  scaleUp: {
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true },
    transition: { duration: 0.5, ease: "easeOut" },
    variants: {
      visible: { opacity: 1, scale: 1 },
      hidden: { opacity: 0, scale: 0.85 },
    },
  },
  blurIn: {
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true },
    transition: { duration: 0.7, ease: "easeOut" },
    variants: {
      visible: { opacity: 1, filter: "blur(0px)" },
      hidden: { opacity: 0, filter: "blur(12px)" },
    },
  },
  slideUp: {
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true },
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
    variants: {
      visible: { y: 0 },
      hidden: { y: 60 },
    },
  },
  flipIn: {
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true },
    transition: { duration: 0.6, ease: "easeOut" },
    variants: {
      visible: { opacity: 1, rotateY: 0 },
      hidden: { opacity: 0, rotateY: 90 },
    },
  },

  // ── Hover ──────────────────────────────────────────────────────────────

  hoverLift: {
    whileHover: {
      y: -6,
      transition: { duration: 0.25, ease: "easeOut" },
    },
    whileTap: { y: 0 },
  },
  hoverGlow: {
    whileHover: {
      boxShadow: "0 0 20px rgba(255,255,255,0.15)",
      transition: { duration: 0.3 },
    },
  },
  press: {
    whileHover: { scale: 1.02, transition: { duration: 0.2 } },
    whileTap: { scale: 0.95 },
  },
};

// ─── applyAnimation ─────────────────────────────────────────────────────────

export const applyAnimation = (prop: any = {}, props: BaseSelectorProps, query: any = null, enabled: boolean = false) => {
  const _root = props.root;
  const style = _root?.style ? CSStoObj(_root.style) || {} : {};

  prop.style = { ...prop.style, ...style };

  // Scroll timeline: attach data attribute so GSAP can find this node
  if (_root?.scrollTimeline?.preset && !enabled) {
    prop["data-scroll-timeline"] = JSON.stringify(_root.scrollTimeline);
  }

  getFontFromComp(props);

  loadCombinedFonts();

  if (!_root?.animation || enabled || prefersReducedMotion()) {
    return prop;
  }

  // ── CSS animation path ──────────────────────────────────────────────
  if (isCSSAnimation(_root.animation)) {
    const { className, style: cssStyle } = getCSSAnimationProps(_root.animation, {
      duration: _root.animationDuration ? parseFloat(_root.animationDuration) : null,
      delay: _root.animationDelay ? parseFloat(_root.animationDelay) : null,
      easing: _root.animationEasing || null,
      trigger: _root.animationTrigger || null,
    });
    if (className) {
      prop.className = [prop.className, className].filter(Boolean).join(" ");
    }
    if (Object.keys(cssStyle).length) {
      prop.style = { ...prop.style, ...cssStyle };
    }
    // Attach IntersectionObserver ref for scroll-triggered animations
    if (className.includes("ph-anim-scroll")) {
      prop.ref = scrollAnimRef;
    }
    return prop;
  }

  // ── Framer-motion path ──────────────────────────────────────────────
  if (!animations[_root.animation]) {
    return prop;
  }

  const preset = { ...animations[_root.animation] };

  // ── User overrides ───────────────────────────────────────────────────

  const duration = _root.animationDuration ? parseFloat(_root.animationDuration) : null;
  const delay = _root.animationDelay ? parseFloat(_root.animationDelay) : null;
  const easing = _root.animationEasing || null;
  const trigger = _root.animationTrigger || null;

  // Override transition duration / delay / ease
  if (duration !== null || delay !== null || easing) {
    const base = preset.transition || {};
    preset.transition = {
      ...base,
      ...(duration !== null && { duration }),
      ...(delay !== null && { delay }),
      ...(easing && easing !== "spring"
        ? { ease: easing, type: "tween" }
        : easing === "spring"
          ? { type: "spring", damping: 15, stiffness: 150 }
          : {}),
    };

    // Also override transition inside whileHover for hover animations
    if (preset.whileHover?.transition) {
      preset.whileHover = {
        ...preset.whileHover,
        transition: {
          ...preset.whileHover.transition,
          ...(duration !== null && { duration }),
          ...(delay !== null && { delay }),
        },
      };
    }
  }

  // Override trigger: convert between scroll / load / hover
  if (trigger) {
    if (trigger === "scroll" && !preset.whileInView) {
      // Convert load animation → scroll-triggered
      const target = preset.animate || preset.variants?.visible;
      if (target) {
        delete preset.animate;
        preset.initial = preset.initial || preset.variants?.hidden || { opacity: 0 };
        preset.whileInView = preset.variants ? "visible" : target;
        preset.viewport = { once: true };
      }
    } else if (trigger === "load" && preset.whileInView) {
      // Convert scroll-triggered → plays on load
      const target = preset.whileInView;
      delete preset.whileInView;
      delete preset.viewport;
      preset.animate = target;
    } else if (trigger === "hover") {
      // Convert to hover-triggered
      const target = preset.animate || (preset.variants?.visible);
      if (target && !preset.whileHover) {
        delete preset.animate;
        delete preset.whileInView;
        delete preset.viewport;
        const hoverState = typeof target === "string" && preset.variants?.[target]
          ? preset.variants[target]
          : target;
        preset.whileHover = hoverState;
        preset.initial = preset.variants?.hidden || preset.initial;
      }
    }
  }

  prop = { ...prop, ...preset };

  return prop;
};

// ─── fontWeightToNumber ─────────────────────────────────────────────────────

export const fontWeightToNumber = {
  "font-thin": 100,
  "font-extralight": 200,
  "font-light": 300,
  "font-normal": 400,
  "font-medium": 500,
  "font-semibold": 600,
  "font-bold": 700,
  "font-extrabold": 800,
  "font-black": 900,
};
