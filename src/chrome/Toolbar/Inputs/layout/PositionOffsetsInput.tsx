import { TbArrowsMove } from "react-icons/tb";
import { ToolbarSection } from "../../ToolbarSection";
import { UniversalInput } from "../UniversalInput";

const ALLOWED_TYPES = ["tailwind", "calc", "px", "%", "em", "rem", "vw", "vh"] as const;

export const PositionOffsetsInput = () => (
  <ToolbarSection
    title="Position Offsets"
    icon={<TbArrowsMove />}
    nested={true}
    collapsible={true}
    defaultOpen={false}
  >
    <UniversalInput
      propKey="inset"
      propTag="inset"
      tailwindKey="inset"
      allowedTypes={[...ALLOWED_TYPES]}
      label="Inset"
      showVarSelector={true}
      inline
    />
    <UniversalInput
      propKey="top"
      propTag="top"
      tailwindKey="top"
      allowedTypes={[...ALLOWED_TYPES]}
      label="Top"
      showVarSelector={true}
      inline
    />
    <UniversalInput
      propKey="right"
      propTag="right"
      tailwindKey="right"
      allowedTypes={[...ALLOWED_TYPES]}
      label="Right"
      showVarSelector={true}
      inline
    />
    <UniversalInput
      propKey="bottom"
      propTag="bottom"
      tailwindKey="bottom"
      allowedTypes={[...ALLOWED_TYPES]}
      label="Bottom"
      showVarSelector={true}
      inline
    />
    <UniversalInput
      propKey="left"
      propTag="left"
      tailwindKey="left"
      allowedTypes={[...ALLOWED_TYPES]}
      label="Left"
      showVarSelector={true}
      inline
    />
  </ToolbarSection>
);
