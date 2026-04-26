/**
 * Effects property definitions — transitions, transforms, filters, backdrop.
 *
 * Main: transition (property/duration/ease/delay) + blur + backdrop blur
 * Advanced: transforms, filters (preview tile), backdrop filters (preview tile), animate
 */
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

  // ─── Main: Blur (most common filter) ─────────────────────────────
  mainEffect("blur", "Blur", ["blur", "focus", "gaussian", "soft"], "blur", 10),
  mainEffect(
    "backdropBlur",
    "Backdrop Blur",
    ["backdrop", "blur", "frosted", "glass"],
    "backdrop-blur",
    11
  ),

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
  advEffect("scale", "Scale", "transform", ["scale", "zoom", "resize"], "scale", 111),
  advEffect("scaleX", "Scale X", "transform", ["scale", "x", "horizontal"], "scale-x", 112),
  advEffect("scaleY", "Scale Y", "transform", ["scale", "y", "vertical"], "scale-y", 113),
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
  advEffect("skewX", "Skew X", "transform", ["skew", "slant", "tilt", "x"], "skew-x", 117),
  advEffect("skewY", "Skew Y", "transform", ["skew", "slant", "tilt", "y"], "skew-y", 118),
  advEffect("transformOrigin", "Origin", "transform", ["origin", "center", "pivot"], "origin", 119),

  advEffect(
    "willChange",
    "Will Change",
    "transform",
    ["will-change", "performance", "gpu"],
    "will-change",
    120
  ),

  // ─── Advanced: Filter (visual preview tile replaces 7 number rows) ──
  {
    id: "filterPreview",
    label: "",
    section: "effects",
    keywords: [
      "filter",
      "brightness",
      "contrast",
      "grayscale",
      "hue",
      "invert",
      "saturate",
      "sepia",
    ],
    input: { type: "custom", component: "FilterPreviewTileFilter" },
    sortOrder: 130,
  },

  // ─── Advanced: Backdrop (visual preview tile replaces 8 number rows) ──
  {
    id: "backdropPreview",
    label: "",
    section: "effects",
    keywords: [
      "backdrop",
      "opacity",
      "brightness",
      "contrast",
      "grayscale",
      "hue",
      "invert",
      "saturate",
      "sepia",
    ],
    input: { type: "custom", component: "FilterPreviewTileBackdrop" },
    sortOrder: 140,
  },
];
