import { TbBrandTailwind } from "react-icons/tb";
import { ToolbarSection } from "../../ToolbarSection";
import { UniversalInput } from "../universal-input";
import type { ValueType } from "../universal-input/types";

/** Matches ring/outline pattern: open-ended values + design vars where useful. */
const EFFECTS_ALLOWED_TYPES: ValueType[] = [
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

function EffectField({
  propKey,
  label,
  tailwindKey,
  propTag,
  index = "",
}: {
  propKey: string;
  label: string;
  tailwindKey: string;
  /** Omit for keys like `twTransform` where options are not `prefix-*` shaped. */
  propTag?: string;
  index?: string;
}) {
  return (
    <UniversalInput
      propKey={propKey}
      propType="class"
      {...(propTag ? { propTag } : {})}
      label={label}
      tailwindKey={tailwindKey}
      index={index}
      showVarSelector={true}
      placeholder=""
      allowedTypes={EFFECTS_ALLOWED_TYPES}
      inline
      inputWidth="flex-1"
    />
  );
}

interface FieldsProps {
  index?: string;
}

/**
 * Per-group field exports for the unified Effects builder. Each group renders
 * its own bare `EffectField` rows (no outer `ToolbarSection` wrapper) so it
 * can be embedded inside a `FloatingPanel` body or any other container.
 */

export const TransitionFields = ({ index = "" }: FieldsProps) => (
  <>
    <EffectField
      propKey="transitionProperty"
      label="Property"
      tailwindKey="transitionProperty"
      propTag="transition"
      index={index}
    />
    <EffectField
      propKey="duration"
      label="Duration"
      tailwindKey="duration"
      propTag="duration"
      index={index}
    />
    <EffectField propKey="ease" label="Easing" tailwindKey="ease" propTag="ease" index={index} />
    <EffectField propKey="delay" label="Delay" tailwindKey="delay" propTag="delay" index={index} />
  </>
);

export const UtilityAnimateFields = ({ index = "" }: FieldsProps) => (
  <EffectField
    propKey="twAnimate"
    label="Animate"
    tailwindKey="twAnimate"
    propTag="animate"
    index={index}
  />
);

export const TransformFields = ({ index = "" }: FieldsProps) => (
  <>
    <EffectField propKey="twTransform" label="GPU mode" tailwindKey="twTransform" index={index} />
    <EffectField propKey="scale" label="Scale" tailwindKey="scale" propTag="scale" index={index} />
    <EffectField
      propKey="scaleX"
      label="Scale X"
      tailwindKey="scaleX"
      propTag="scale-x"
      index={index}
    />
    <EffectField
      propKey="scaleY"
      label="Scale Y"
      tailwindKey="scaleY"
      propTag="scale-y"
      index={index}
    />
    <EffectField
      propKey="rotate"
      label="Rotate"
      tailwindKey="rotate"
      propTag="rotate"
      index={index}
    />
    <EffectField
      propKey="translateX"
      label="Translate X"
      tailwindKey="translateX"
      propTag="translate-x"
      index={index}
    />
    <EffectField
      propKey="translateY"
      label="Translate Y"
      tailwindKey="translateY"
      propTag="translate-y"
      index={index}
    />
    <EffectField
      propKey="skewX"
      label="Skew X"
      tailwindKey="skewX"
      propTag="skew-x"
      index={index}
    />
    <EffectField
      propKey="skewY"
      label="Skew Y"
      tailwindKey="skewY"
      propTag="skew-y"
      index={index}
    />
    <EffectField
      propKey="transformOrigin"
      label="Origin"
      tailwindKey="transformOrigin"
      propTag="origin"
      index={index}
    />
    <EffectField
      propKey="willChange"
      label="Will-change"
      tailwindKey="willChange"
      propTag="will-change"
      index={index}
    />
  </>
);

export const FilterFields = ({ index = "" }: FieldsProps) => (
  <>
    <EffectField propKey="blur" label="Blur" tailwindKey="blur" propTag="blur" index={index} />
    <EffectField
      propKey="brightness"
      label="Brightness"
      tailwindKey="brightness"
      propTag="brightness"
      index={index}
    />
    <EffectField
      propKey="contrast"
      label="Contrast"
      tailwindKey="contrast"
      propTag="contrast"
      index={index}
    />
    <EffectField
      propKey="grayscale"
      label="Grayscale"
      tailwindKey="grayscale"
      propTag="grayscale"
      index={index}
    />
    <EffectField
      propKey="hueRotate"
      label="Hue rotate"
      tailwindKey="hueRotate"
      propTag="hue-rotate"
      index={index}
    />
    <EffectField
      propKey="invert"
      label="Invert"
      tailwindKey="invert"
      propTag="invert"
      index={index}
    />
    <EffectField
      propKey="saturate"
      label="Saturate"
      tailwindKey="saturate"
      propTag="saturate"
      index={index}
    />
    <EffectField propKey="sepia" label="Sepia" tailwindKey="sepia" propTag="sepia" index={index} />
  </>
);

export const BackdropFields = ({ index = "" }: FieldsProps) => (
  <>
    <EffectField
      propKey="backdropBlur"
      label="Blur"
      tailwindKey="backdropBlur"
      propTag="backdrop-blur"
      index={index}
    />
    <EffectField
      propKey="backdropOpacity"
      label="Opacity"
      tailwindKey="backdropOpacity"
      propTag="backdrop-opacity"
      index={index}
    />
    <EffectField
      propKey="backdropBrightness"
      label="Brightness"
      tailwindKey="backdropBrightness"
      propTag="backdrop-brightness"
      index={index}
    />
    <EffectField
      propKey="backdropContrast"
      label="Contrast"
      tailwindKey="backdropContrast"
      propTag="backdrop-contrast"
      index={index}
    />
    <EffectField
      propKey="backdropGrayscale"
      label="Grayscale"
      tailwindKey="backdropGrayscale"
      propTag="backdrop-grayscale"
      index={index}
    />
    <EffectField
      propKey="backdropHueRotate"
      label="Hue rotate"
      tailwindKey="backdropHueRotate"
      propTag="backdrop-hue-rotate"
      index={index}
    />
    <EffectField
      propKey="backdropInvert"
      label="Invert"
      tailwindKey="backdropInvert"
      propTag="backdrop-invert"
      index={index}
    />
    <EffectField
      propKey="backdropSaturate"
      label="Saturate"
      tailwindKey="backdropSaturate"
      propTag="backdrop-saturate"
      index={index}
    />
    <EffectField
      propKey="backdropSepia"
      label="Sepia"
      tailwindKey="backdropSepia"
      propTag="backdrop-sepia"
      index={index}
    />
  </>
);

/**
 * Class-based transition, transform, filter, and `animate-*` utilities on `className`.
 * Kept for backwards compat with any existing consumers; the unified Effects
 * builder uses the per-group field exports above.
 */
export const EffectsClassInput = ({ index = "" }: { index?: string }) => (
  <ToolbarSection
    title="Tailwind effects"
    icon={<TbBrandTailwind />}
    nested={false}
    collapsible={true}
    defaultOpen={false}
    help="Transitions, transforms, filters, and backdrop effects."
  >
    <ToolbarSection title="Transition" icon={null} nested collapsible defaultOpen={false}>
      <TransitionFields index={index} />
    </ToolbarSection>

    <ToolbarSection title="Utility animate" icon={null} nested collapsible defaultOpen={false}>
      <UtilityAnimateFields index={index} />
    </ToolbarSection>

    <ToolbarSection title="Transform" icon={null} nested collapsible defaultOpen={false}>
      <TransformFields index={index} />
    </ToolbarSection>

    <ToolbarSection title="Filter" icon={null} nested collapsible defaultOpen={false}>
      <FilterFields index={index} />
    </ToolbarSection>

    <ToolbarSection title="Backdrop" icon={null} nested collapsible defaultOpen={false}>
      <BackdropFields index={index} />
    </ToolbarSection>
  </ToolbarSection>
);
