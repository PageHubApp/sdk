/**
 * Effects property definitions — six popover-mode rows under one section.
 *
 * Each row is its own popover-mode property (chip + lazy panel) backed by the
 * shared `EffectRowInputPopover` trigger which dispatches by `def.id`. Standard
 * `+` button in the section header (via AccordionAddMenu) shows the addable
 * rows and opens the matching popover on pick — same UX as Action / Animation /
 * Conditions, just with multiple rows in one section.
 *
 * Storage stays SPLIT (animation on `root.*`, scroll-effect on container
 * props, transition / transform / filter / backdrop on className tokens).
 * The trigger looks up readers / writers from `effects-builder/effectTypes.tsx`.
 *
 * `isActive` on each prop is what keeps the section body tight: PropertySection
 * uses it to gate visibility (only ACTIVE rows render in body), and
 * AccordionAddMenu uses it to hide already-active entries from the picker.
 */
import type { PropertyDef } from "../propertyDefs";
import {
  BACKDROP_PREFIXES,
  FILTER_PREFIXES,
  TRANSFORM_PREFIXES,
  TRANSITION_PREFIXES,
  classNameHasAnyPrefix,
} from "./effects-builder/effectTypes";

export const effectsProperties: PropertyDef[] = [
  {
    id: "animation",
    label: "Animation",
    section: "effects",
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
    hideKey: "animations",
    sortOrder: 10,
    isActive: (_cn, props) => !!props?.root?.animation,
    input: { type: "custom", component: "EffectRowInput" },
  },
  {
    id: "scroll-effect",
    label: "Scroll Effect",
    section: "effects",
    keywords: ["scroll", "horizontal", "timeline", "pin", "gsap", "section", "parallax"],
    sortOrder: 20,
    // Container-only — gate matches the now-deleted `scrollEffect` prop in advanced.ts.
    showWhen: (_cls, props) => props._craftName === "Container",
    isActive: (_cn, props) => !!props?.scrollEffect,
    input: { type: "custom", component: "EffectRowInput" },
  },
  {
    id: "transition",
    label: "Transition",
    section: "effects",
    keywords: ["transition", "duration", "ease", "delay", "timing", "curve", "ms", "speed"],
    hideKey: "effectsClass",
    sortOrder: 30,
    isActive: cn => classNameHasAnyPrefix(cn, TRANSITION_PREFIXES),
    input: { type: "custom", component: "EffectRowInput" },
  },
  {
    id: "transform",
    label: "Transform",
    section: "effects",
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
    hideKey: "effectsClass",
    sortOrder: 40,
    isActive: cn => classNameHasAnyPrefix(cn, TRANSFORM_PREFIXES),
    input: { type: "custom", component: "EffectRowInput" },
  },
  {
    id: "filter",
    label: "Filter",
    section: "effects",
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
    hideKey: "effectsClass",
    sortOrder: 50,
    isActive: cn => classNameHasAnyPrefix(cn, FILTER_PREFIXES),
    input: { type: "custom", component: "EffectRowInput" },
  },
  {
    id: "backdrop",
    label: "Backdrop Filter",
    section: "effects",
    keywords: ["backdrop", "frosted", "glass", "blur", "filter"],
    hideKey: "effectsClass",
    sortOrder: 60,
    isActive: cn => classNameHasAnyPrefix(cn, BACKDROP_PREFIXES),
    input: { type: "custom", component: "EffectRowInput" },
  },
];
