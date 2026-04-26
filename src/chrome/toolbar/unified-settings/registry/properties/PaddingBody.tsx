/**
 * Padding section body — extracted from SpacingBody so Padding and Margin
 * can be added/removed independently via the +Add menu.
 */
import { UniversalInput } from "../../../inputs/universal-input";
import type { ValueType } from "../../../inputs/universal-input/types";
import { ToolbarSection } from "../../../ToolbarSection";
import { ItemAdvanceToggle } from "../../../helpers/ItemSelector";

const SPACING_TYPES: ValueType[] = ["tailwind", "calc", "px", "em", "rem", "%"];

export function PaddingBody() {
  return (
    <>
      <UniversalInput
        propKey="p"
        propTag="p"
        allowedTypes={SPACING_TYPES}
        label="All"
        labelWidth="w-16"
        showVarSelector
        inline
      />
      <UniversalInput
        propKey="px"
        propTag="px"
        allowedTypes={SPACING_TYPES}
        label="X"
        labelWidth="w-16"
        showVarSelector
        inline
      />
      <UniversalInput
        propKey="py"
        propTag="py"
        allowedTypes={SPACING_TYPES}
        label="Y"
        labelWidth="w-16"
        showVarSelector
        inline
      />
      <ItemAdvanceToggle propKey="padding-side" title="Per-side">
        <ToolbarSection title="" nested full={2} collapsible={false}>
          <UniversalInput
            propKey="pt"
            propTag="pt"
            allowedTypes={SPACING_TYPES}
            label="Top"
            labelWidth="w-16"
            showVarSelector
            inline
          />
          <UniversalInput
            propKey="pb"
            propTag="pb"
            allowedTypes={SPACING_TYPES}
            label="Bottom"
            labelWidth="w-16"
            showVarSelector
            inline
          />
          <UniversalInput
            propKey="pl"
            propTag="pl"
            allowedTypes={SPACING_TYPES}
            label="Left"
            labelWidth="w-16"
            showVarSelector
            inline
          />
          <UniversalInput
            propKey="pr"
            propTag="pr"
            allowedTypes={SPACING_TYPES}
            label="Right"
            labelWidth="w-16"
            showVarSelector
            inline
          />
        </ToolbarSection>
      </ItemAdvanceToggle>
    </>
  );
}
