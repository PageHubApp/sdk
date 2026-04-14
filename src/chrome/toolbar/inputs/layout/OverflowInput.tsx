import { UniversalInput } from "../universal-input";

/**
 * Overflow is a layout prop (mobile base, desktop = md: overrides) — same as display/position.
 * Do not put it on root; pair `root.radius` with `mobile.overflow` / `desktop.overflow` when you need clipping.
 */
export const OverflowInput = () => (
  <UniversalInput
    propKey="overflow"
    propTag="overflow"
    tailwindKey="overflow"
    allowedTypes={["tailwind", "calc"]}
    label="Overflow"
    labelHide={false}
    showVarSelector={true}
  />
);
