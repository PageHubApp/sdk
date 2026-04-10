import { TbSpacingHorizontal } from "react-icons/tb";
import { ToolbarSection } from "../../ToolbarSection";
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
    {/* Collapsible nested group — same pattern as Ring & outline (RingOutlineInput) */}
    <ToolbarSection
      title="Gap X & Y"
      icon={<TbSpacingHorizontal className="size-3.5" />}
      nested
      collapsible
      defaultOpen
      full={2}
    >
      <UniversalInput
        propKey="gapX"
        propTag="gap-x"
        tailwindKey="gapX"
        type="select"
        label="Gap X"
        labelWidth="w-12"
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
        labelWidth="w-12"
        showVarSelector={true}
        varSelectorPrefix="gap-y"
        inline
      />
    </ToolbarSection>
  </>
);
