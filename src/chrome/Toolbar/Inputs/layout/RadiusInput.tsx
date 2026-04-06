import { UniversalInput } from "../UniversalInput";

export const RadiusInput = () => (
  <UniversalInput
    propKey="radius"
    propType="class"
    propTag="rounded"
    tailwindKey="radius"
    type="select"
    label="Radius"
    showVarSelector={true}
    varSelectorPrefix="rounded"
    inline
  />
);
