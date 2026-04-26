/**
 * Margin section body — paired with PaddingBody, splittable via +Add.
 */
import { UniversalInput } from "../../../inputs/universal-input";
import type { ValueType } from "../../../inputs/universal-input/types";
import { ToolbarSection } from "../../../ToolbarSection";
import { ItemAdvanceToggle } from "../../../helpers/ItemSelector";

const SPACING_TYPES: ValueType[] = ["tailwind", "calc", "px", "em", "rem", "%"];

export function MarginBody() {
  return (
    <>
      <UniversalInput
        propKey="m"
        propTag="m"
        allowedTypes={SPACING_TYPES}
        label="All"
        labelWidth="w-16"
        showVarSelector
        inline
      />
      <UniversalInput
        propKey="mx"
        propTag="mx"
        allowedTypes={SPACING_TYPES}
        label="X"
        labelWidth="w-16"
        showVarSelector
        inline
      />
      <UniversalInput
        propKey="my"
        propTag="my"
        allowedTypes={SPACING_TYPES}
        label="Y"
        labelWidth="w-16"
        showVarSelector
        inline
      />
      <ItemAdvanceToggle propKey="margin-side" title="Per-side">
        <ToolbarSection title="" nested full={2} collapsible={false}>
          <UniversalInput
            propKey="mt"
            propTag="mt"
            allowedTypes={SPACING_TYPES}
            label="Top"
            labelWidth="w-16"
            showVarSelector
            inline
          />
          <UniversalInput
            propKey="mb"
            propTag="mb"
            allowedTypes={SPACING_TYPES}
            label="Bottom"
            labelWidth="w-16"
            showVarSelector
            inline
          />
          <UniversalInput
            propKey="ml"
            propTag="ml"
            allowedTypes={SPACING_TYPES}
            label="Left"
            labelWidth="w-16"
            showVarSelector
            inline
          />
          <UniversalInput
            propKey="mr"
            propTag="mr"
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
