/**
 * effectTypes — single source of truth for the unified Effects builder.
 *
 * The Effects section aggregates 6 distinct authoring concerns under one
 * accordion: Animation (root props), Scroll Effect (Container props),
 * Transition / Transform / Filter / Backdrop (className tokens). Each row in
 * the builder is one entry below; the builder reads/writes via these helpers
 * and never touches storage directly.
 *
 * Storage shapes are intentionally split — we did NOT migrate to a unified
 * schema. The builder is a VIEW.
 */
import { lazy, type LazyExoticComponent, type ComponentType } from "react";
import {
  TbBolt,
  TbChevronsDown,
  TbDroplet,
  TbStack,
  TbTransitionRight,
  TbWand,
} from "react-icons/tb";
import { cssAnimationPresets } from "@/utils/animations";
import type { HideKey } from "../../../types";

// ─── Types ──────────────────────────────────────────────────────────────

export type EffectId =
  | "animation"
  | "scroll-effect"
  | "transition"
  | "transform"
  | "filter"
  | "backdrop";

export interface EffectGateContext {
  craftName: string;
  containerType?: string;
}

/** Slice of node data the builder reads. */
export interface EffectNodeView {
  className: string;
  props: Record<string, any>;
  craftName: string;
}

export type SetPropFn = (cb: (p: any) => void, throttleRate?: number) => void;

export interface EditorPanelProps {
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}

export interface EffectType {
  id: EffectId;
  label: string;
  /** Short search keywords (used by the Add picker filter). */
  keywords: string[];
  /** Icon component. Pass through `className="size-3.5"` style props. */
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** If set, hidden when this key is in the component's `disable[]`. */
  hideKey?: HideKey;
  /** Optional add-time gate (e.g. scroll-effect = Container only). */
  gate?: (ctx: EffectGateContext) => boolean;
  /** Tooltip / picker help text. */
  help: string;
  /** True when this effect has any active value on the node. */
  isActive: (view: EffectNodeView) => boolean;
  /** Short readable summary for the chip (e.g. "Fade Up", "Horizontal Scroll"). */
  summary: (view: EffectNodeView) => string;
  /** Write minimal default values when the user adds this effect. */
  applyDefault: (setProp: SetPropFn) => void;
  /** Clear ALL state owned by this effect (props + className tokens). */
  clear: (setProp: SetPropFn) => void;
  /** Lazy-loaded editor panel mounted when the chip is clicked. */
  EditorPanel: LazyExoticComponent<ComponentType<EditorPanelProps>>;
}

// ─── className helpers ──────────────────────────────────────────────────

/** Strip Tailwind variant prefixes (`md:`, `dark:`, `hover:`, …). */
function stripVariants(token: string): string {
  return token.replace(/^(?:[a-zA-Z0-9_-]+:)*/, "");
}

/** Token = exact match OR `prefix-...`. */
function tokenMatchesPrefix(token: string, prefix: string): boolean {
  const t = stripVariants(token);
  return t === prefix || t.startsWith(prefix + "-");
}

export function classNameHasAnyPrefix(className: string, prefixes: string[]): boolean {
  if (!className) return false;
  const tokens = className.split(/\s+/).filter(Boolean);
  return tokens.some(tok => prefixes.some(p => tokenMatchesPrefix(tok, p)));
}

export function stripPrefixes(className: string, prefixes: string[]): string {
  if (!className) return "";
  return className
    .split(/\s+/)
    .filter(Boolean)
    .filter(tok => !prefixes.some(p => tokenMatchesPrefix(tok, p)))
    .join(" ")
    .trim();
}

/** Append space-separated tokens, deduping against existing className. */
export function addClassTokens(className: string, tokens: string[]): string {
  const existing = new Set((className || "").split(/\s+/).filter(Boolean));
  for (const t of tokens) existing.add(t);
  return Array.from(existing).join(" ");
}

/**
 * Short readable summary of which className tokens (matching `prefixes`) are
 * active. "blur-sm scale-100" → "blur-sm, scale-100"; truncates at 3 entries
 * with "…" so the chip stays single-line.
 */
export function summarizeClassTokens(className: string, prefixes: string[]): string {
  if (!className) return "";
  const matches: string[] = [];
  for (const tok of className.split(/\s+/).filter(Boolean)) {
    const stripped = stripVariants(tok);
    if (prefixes.some(p => stripped === p || stripped.startsWith(p + "-"))) {
      matches.push(stripped);
    }
  }
  if (matches.length === 0) return "";
  if (matches.length <= 2) return matches.join(", ");
  return `${matches.slice(0, 2).join(", ")} +${matches.length - 2}`;
}

// ─── Token prefix lists (per effect) ─────────────────────────────────────

export const TRANSITION_PREFIXES = ["transition", "duration", "ease", "delay"];

export const TRANSFORM_PREFIXES = [
  "scale",
  "scale-x",
  "scale-y",
  "rotate",
  "translate",
  "translate-x",
  "translate-y",
  "skew",
  "skew-x",
  "skew-y",
  "origin",
  "transform",
  "will-change",
];

export const FILTER_PREFIXES = [
  "blur",
  "brightness",
  "contrast",
  "grayscale",
  "hue-rotate",
  "invert",
  "saturate",
  "sepia",
  "filter",
];

export const BACKDROP_PREFIXES = [
  "backdrop-blur",
  "backdrop-brightness",
  "backdrop-contrast",
  "backdrop-grayscale",
  "backdrop-hue-rotate",
  "backdrop-invert",
  "backdrop-opacity",
  "backdrop-saturate",
  "backdrop-sepia",
  "backdrop-filter",
];

// ─── Animation helpers ──────────────────────────────────────────────────

const ANIMATION_PARAM_KEYS = [
  "animationDuration",
  "animationDelay",
  "animationEasing",
  "animationTrigger",
  "animationLoop",
  "animationStagger",
  "animationExit",
];

function describeAnimation(key: string, engine: string): string {
  if (!key) return "Animation";
  const preset = (cssAnimationPresets as Record<string, { label?: string }>)[key];
  if (preset?.label) return preset.label;
  return engine === "framer" ? `Framer: ${key}` : key;
}

// ─── Scroll-effect helpers ──────────────────────────────────────────────

const SCROLL_EFFECT_LABELS: Record<string, string> = {
  "horizontal-scroll": "Horizontal Scroll",
  "scroll-timeline": "Scroll Timeline",
};

// ─── Lazy editor panels ─────────────────────────────────────────────────

const AnimationEditorPanel = lazy(() => import("./rows/AnimationEditorPanel"));
const ScrollEffectEditorPanel = lazy(() => import("./rows/ScrollEffectEditorPanel"));
const TransitionEditorPanel = lazy(() => import("./rows/TransitionEditorPanel"));
const TransformEditorPanel = lazy(() => import("./rows/TransformEditorPanel"));
const FilterEditorPanel = lazy(() => import("./rows/FilterEditorPanel"));
const BackdropEditorPanel = lazy(() => import("./rows/BackdropEditorPanel"));

// ─── Registry ───────────────────────────────────────────────────────────

export const EFFECT_TYPES: EffectType[] = [
  {
    id: "animation",
    label: "Animation",
    keywords: [
      "animation",
      "animate",
      "motion",
      "entrance",
      "fade",
      "slide",
      "scale",
      "spring",
      "bounce",
      "framer",
      "css",
      "preset",
    ],
    Icon: TbBolt,
    hideKey: "animations",
    help: "Entrance / scroll / hover motion presets.",
    isActive: ({ props }) => !!props?.root?.animation,
    summary: ({ props }) => {
      const key = (props?.root?.animation as string) || "";
      if (!key) return "";
      const engine = (props?.root?.animationEngine as string) || "css";
      return describeAnimation(key, engine);
    },
    applyDefault: setProp => {
      // Default to "cssFadeUp" — sensible, well-known entrance preset.
      setProp(p => {
        if (!p.root) p.root = {};
        if (!p.root.animation) {
          p.root.animation = "cssFadeUp";
          p.root.animationEngine = p.root.animationEngine || "css";
        }
      });
    },
    clear: setProp => {
      setProp(p => {
        if (!p.root) return;
        p.root.animation = "";
        for (const k of ANIMATION_PARAM_KEYS) delete p.root[k];
      });
    },
    EditorPanel: AnimationEditorPanel,
  },
  {
    id: "scroll-effect",
    label: "Scroll Effect",
    keywords: ["scroll", "horizontal", "timeline", "pin", "gsap", "section", "parallax"],
    Icon: TbChevronsDown,
    gate: ({ craftName }) => craftName === "Container",
    help: "Pin a section and animate children as the user scrolls (Container only).",
    isActive: ({ props }) => !!props?.scrollEffect,
    summary: ({ props }) => {
      const v = (props?.scrollEffect as string) || "";
      if (!v) return "";
      return SCROLL_EFFECT_LABELS[v] || v;
    },
    applyDefault: setProp => {
      // Don't pre-pick — let user choose Horizontal vs Timeline. Just make
      // sure the section type is set so the editor's main path is reachable.
      setProp(p => {
        if (!p.type) p.type = "section";
      });
    },
    clear: setProp => {
      setProp(p => {
        p.scrollEffect = "";
        p.scrollDirection = undefined;
        p.scrollSpeed = undefined;
        p.scrollSnap = undefined;
        p.scrollTimelineRunway = undefined;
        p.scrollSmoothing = undefined;
      });
    },
    EditorPanel: ScrollEffectEditorPanel,
  },
  {
    id: "transition",
    label: "Transition",
    keywords: [
      "transition",
      "duration",
      "ease",
      "easing",
      "delay",
      "timing",
      "curve",
      "ms",
      "speed",
    ],
    Icon: TbTransitionRight,
    hideKey: "effectsClass",
    help: "CSS transitions — property, duration, easing, delay.",
    isActive: ({ className }) => classNameHasAnyPrefix(className, TRANSITION_PREFIXES),
    summary: ({ className }) => summarizeClassTokens(className, TRANSITION_PREFIXES),
    applyDefault: setProp => {
      setProp(p => {
        p.className = addClassTokens(p.className || "", ["transition", "duration-300"]);
      });
    },
    clear: setProp => {
      setProp(p => {
        p.className = stripPrefixes(p.className || "", TRANSITION_PREFIXES);
      });
    },
    EditorPanel: TransitionEditorPanel,
  },
  {
    id: "transform",
    label: "Transform",
    keywords: [
      "transform",
      "scale",
      "rotate",
      "translate",
      "skew",
      "origin",
      "gpu",
      "3d",
      "hardware",
    ],
    Icon: TbStack,
    hideKey: "effectsClass",
    help: "Scale, rotate, translate, skew, origin.",
    isActive: ({ className }) => classNameHasAnyPrefix(className, TRANSFORM_PREFIXES),
    summary: ({ className }) => summarizeClassTokens(className, TRANSFORM_PREFIXES),
    applyDefault: setProp => {
      // scale-100 is a no-op identity — safe starting point user can edit.
      setProp(p => {
        p.className = addClassTokens(p.className || "", ["scale-100"]);
      });
    },
    clear: setProp => {
      setProp(p => {
        p.className = stripPrefixes(p.className || "", TRANSFORM_PREFIXES);
      });
    },
    EditorPanel: TransformEditorPanel,
  },
  {
    id: "filter",
    label: "Filter",
    keywords: [
      "filter",
      "blur",
      "brightness",
      "contrast",
      "grayscale",
      "hue",
      "invert",
      "saturate",
      "sepia",
    ],
    Icon: TbDroplet,
    hideKey: "effectsClass",
    help: "Blur, brightness, contrast, saturation, etc.",
    isActive: ({ className }) => classNameHasAnyPrefix(className, FILTER_PREFIXES),
    summary: ({ className }) => summarizeClassTokens(className, FILTER_PREFIXES),
    applyDefault: setProp => {
      setProp(p => {
        p.className = addClassTokens(p.className || "", ["blur-sm"]);
      });
    },
    clear: setProp => {
      setProp(p => {
        p.className = stripPrefixes(p.className || "", FILTER_PREFIXES);
      });
    },
    EditorPanel: FilterEditorPanel,
  },
  {
    id: "backdrop",
    label: "Backdrop Filter",
    keywords: ["backdrop", "frosted", "glass", "blur", "filter"],
    Icon: TbWand,
    hideKey: "effectsClass",
    help: "Backdrop filter — frosted glass effects on the layer beneath.",
    isActive: ({ className }) => classNameHasAnyPrefix(className, BACKDROP_PREFIXES),
    summary: ({ className }) => summarizeClassTokens(className, BACKDROP_PREFIXES),
    applyDefault: setProp => {
      setProp(p => {
        p.className = addClassTokens(p.className || "", ["backdrop-blur-sm"]);
      });
    },
    clear: setProp => {
      setProp(p => {
        p.className = stripPrefixes(p.className || "", BACKDROP_PREFIXES);
      });
    },
    EditorPanel: BackdropEditorPanel,
  },
];

export function getEffectType(id: EffectId): EffectType | undefined {
  return EFFECT_TYPES.find(e => e.id === id);
}
