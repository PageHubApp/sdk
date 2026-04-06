import { UniversalInput } from "../UniversalInput";

export const GapInput = () => (
  <>
    <UniversalInput
      propKey="gap"
      propTag="gap"
      tailwindKey="gap"
      type="select"
      label="Gap"
      showVarSelector={true}
      varSelectorPrefix="gap"
      inline
    />
    <UniversalInput
      propKey="gapX"
      propTag="gap-x"
      tailwindKey="gapX"
      type="select"
      label="Gap X"
      showVarSelector={true}
      varSelectorPrefix="gap-x"
      inline
    />
    <UniversalInput
      propKey="gapY"
      propTag="gap-y"
      tailwindKey="gapY"
      type="select"
      label="Gap Y"
      showVarSelector={true}
      varSelectorPrefix="gap-y"
      inline
    />
  </>
);
