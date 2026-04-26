/**
 * Effects property definitions — transitions, transforms, filters, backdrop.
 *
 * Main: transition (property/duration/ease/delay) + blur + backdrop blur
 * Advanced: transforms, filters (preview tile), backdrop filters (preview tile), animate
 */
import React from "react";
import { TbBoxPadding, TbSquare } from "react-icons/tb";
import type { PropertyDef } from "../propertyDefs";
import type { ValueType } from "../../../inputs/universal-input/types";

const EFFECTS_TYPES: ValueType[] = [
  "tailwind",
  "calc",
  "px",
  "%",
  "em",
  "rem",
  "vw",
  "vh",
  "vmin",
  "vmax",
];

/** Main effect — visible by default */
function mainEffect(
  id: string,
  label: string,
  keywords: string[],
  propTag?: string,
  sortOrder = 0
): PropertyDef {
  return {
    id,
    label,
    section: "effects",
    keywords,
    input: {
      type: "universal",
      propTag: propTag || id,
      allowedTypes: EFFECTS_TYPES,
      showVarSelector: true,
    },
    sortOrder,
    inline: true,
  };
}

/** Filter / backdrop bundle child — renders a single universal-input row inside the popover. */
function filterChild(
  id: string,
  label: string,
  propTag: string,
  keywords: string[]
): PropertyDef {
  return {
    id,
    label,
    section: "styles",
    keywords,
    input: {
      type: "universal",
      propTag,
      allowedTypes: EFFECTS_TYPES,
      showVarSelector: true,
    },
    inline: true,
  };
}

/** Advanced effect — hidden until added via the +Add picker */
function advEffect(
  id: string,
  label: string,
  _group: string,
  keywords: string[],
  propTag?: string,
  sortOrder = 100
): PropertyDef {
  return {
    id,
    label,
    section: "effects",
    keywords,
    input: {
      type: "universal",
      propTag: propTag || id,
      allowedTypes: EFFECTS_TYPES,
      showVarSelector: true,
    },
    sortOrder,
    inline: true,
  };
}

export const effectsProperties: PropertyDef[] = [
  // ─── Main: Transition ────────────────────────────────────────────
  mainEffect(
    "transitionProperty",
    "Transition",
    ["transition", "property", "animate"],
    "transition",
    0
  ),
  mainEffect("duration", "Duration", ["duration", "time", "speed", "ms"], "duration", 1),
  mainEffect("ease", "Easing", ["ease", "easing", "curve", "timing", "bezier"], "ease", 2),
  mainEffect("delay", "Delay", ["delay", "wait", "pause"], "delay", 3),

  // ─── Filter (bundle: chip → popover, blur+brightness+contrast+...) ──
  {
    id: "filter",
    label: "Filter",
    section: "styles",
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
    sortOrder: 60,
    input: {
      type: "bundle",
      properties: [
        filterChild("blur", "Blur", "blur", ["blur", "focus", "gaussian", "soft"]),
        filterChild("brightness", "Brightness", "brightness", ["brightness", "light"]),
        filterChild("contrast", "Contrast", "contrast", ["contrast"]),
        filterChild("grayscale", "Grayscale", "grayscale", ["grayscale", "mono"]),
        filterChild("hueRotate", "Hue Rotate", "hue-rotate", ["hue", "rotate", "color"]),
        filterChild("invert", "Invert", "invert", ["invert", "negative"]),
        filterChild("saturate", "Saturate", "saturate", ["saturate", "color"]),
        filterChild("sepia", "Sepia", "sepia", ["sepia", "vintage"]),
      ],
    },
  },

  // ─── Backdrop Filter (bundle: chip → popover, frosted glass) ─────
  {
    id: "backdropFilter",
    label: "Backdrop",
    section: "styles",
    keywords: [
      "backdrop",
      "filter",
      "blur",
      "frosted",
      "glass",
      "brightness",
      "contrast",
      "grayscale",
      "hue",
      "invert",
      "saturate",
      "sepia",
      "opacity",
    ],
    sortOrder: 70,
    input: {
      type: "bundle",
      properties: [
        filterChild("backdropBlur", "Blur", "backdrop-blur", ["backdrop", "blur", "frosted"]),
        filterChild("backdropBrightness", "Brightness", "backdrop-brightness", ["backdrop", "brightness"]),
        filterChild("backdropContrast", "Contrast", "backdrop-contrast", ["backdrop", "contrast"]),
        filterChild("backdropGrayscale", "Grayscale", "backdrop-grayscale", ["backdrop", "grayscale"]),
        filterChild("backdropHueRotate", "Hue Rotate", "backdrop-hue-rotate", ["backdrop", "hue", "rotate"]),
        filterChild("backdropInvert", "Invert", "backdrop-invert", ["backdrop", "invert"]),
        filterChild("backdropOpacity", "Opacity", "backdrop-opacity", ["backdrop", "opacity"]),
        filterChild("backdropSaturate", "Saturate", "backdrop-saturate", ["backdrop", "saturate"]),
        filterChild("backdropSepia", "Sepia", "backdrop-sepia", ["backdrop", "sepia"]),
      ],
    },
  },

  // ─── Advanced: Animate ───────────────────────────────────────────
  advEffect(
    "twAnimate",
    "Animate",
    "animate",
    ["animate", "spin", "ping", "pulse", "bounce"],
    "animate",
    100
  ),

  // ─── Advanced: Transform ─────────────────────────────────────────
  advEffect(
    "twTransform",
    "GPU Transform",
    "transform",
    ["transform", "gpu", "3d", "hardware"],
    undefined,
    110
  ),
  {
    id: "scale",
    label: "Scale",
    section: "effects",
    keywords: ["scale", "zoom", "resize", "x", "y"],
    input: {
      type: "shorthand",
      tailwindKey: "scale",
      varSelectorPrefix: "scale",
      allowedTypes: [...EFFECTS_TYPES],
      modes: [
        {
          id: "uniform",
          icon: React.createElement(TbSquare, { className: "size-3.5" }),
          ariaLabel: "Uniform scale",
          tags: ["scale"],
          labels: [""],
        },
        {
          id: "axes",
          icon: React.createElement(TbBoxPadding, { className: "size-3.5" }),
          ariaLabel: "Scale X & Y",
          tags: ["scale-x", "scale-y"],
          labels: ["X", "Y"],
          tailwindKeys: ["scaleX", "scaleY"],
        },
      ],
    },
    sortOrder: 111,
  },
  advEffect("rotate", "Rotate", "transform", ["rotate", "spin", "angle", "degrees"], "rotate", 114),
  advEffect(
    "translateX",
    "Translate X",
    "transform",
    ["translate", "move", "x", "horizontal"],
    "translate-x",
    115
  ),
  advEffect(
    "translateY",
    "Translate Y",
    "transform",
    ["translate", "move", "y", "vertical"],
    "translate-y",
    116
  ),
  {
    id: "skew",
    label: "Skew",
    section: "effects",
    keywords: ["skew", "slant", "tilt", "x", "y"],
    input: {
      type: "shorthand",
      varSelectorPrefix: "skew",
      allowedTypes: [...EFFECTS_TYPES],
      modes: [
        {
          id: "axes",
          icon: React.createElement(TbBoxPadding, { className: "size-3.5" }),
          ariaLabel: "Skew X & Y",
          tags: ["skew-x", "skew-y"],
          labels: ["X", "Y"],
          tailwindKeys: ["skewX", "skewY"],
        },
      ],
    },
    sortOrder: 117,
  },
  advEffect("transformOrigin", "Origin", "transform", ["origin", "center", "pivot"], "origin", 119),

  advEffect(
    "willChange",
    "Will Change",
    "transform",
    ["will-change", "performance", "gpu"],
    "will-change",
    120
  ),

];
