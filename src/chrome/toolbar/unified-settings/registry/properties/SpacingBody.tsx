/**
 * Spacing section body — padding + margin with shared type selector.
 * No ToolbarSection wrapper — PropertySection provides that.
 */
import { UniversalInput } from "../../../inputs/universal-input";
import type { ValueType } from "../../../inputs/universal-input/types";
import { ToolbarSection } from "../../../ToolbarSection";
import { ItemAdvanceToggle } from "../../../helpers/ItemSelector";

const SPACING_TYPES: ValueType[] = ["tailwind", "calc", "px", "em", "rem", "%"];

export function SpacingBody() {
  return (
    <>
      <ToolbarSection title="Padding" nested full={1} collapsible={false}>
        <UniversalInput
          propKey="p"
          propTag="p"
          allowedTypes={SPACING_TYPES}
          label="All"
          labelWidth="w-12"
          showVarSelector
          inline
        />
        <UniversalInput
          propKey="px"
          propTag="px"
          allowedTypes={SPACING_TYPES}
          label="X"
          labelWidth="w-12"
          showVarSelector
          inline
        />
        <UniversalInput
          propKey="py"
          propTag="py"
          allowedTypes={SPACING_TYPES}
          label="Y"
          labelWidth="w-12"
          showVarSelector
          inline
        />
      </ToolbarSection>

      <ToolbarSection title="Margin" nested full={1} collapsible={false}>
        <UniversalInput
          propKey="m"
          propTag="m"
          allowedTypes={SPACING_TYPES}
          label="All"
          labelWidth="w-12"
          showVarSelector
          inline
        />
        <UniversalInput
          propKey="mx"
          propTag="mx"
          allowedTypes={SPACING_TYPES}
          label="X"
          labelWidth="w-12"
          showVarSelector
          inline
        />
        <UniversalInput
          propKey="my"
          propTag="my"
          allowedTypes={SPACING_TYPES}
          label="Y"
          labelWidth="w-12"
          showVarSelector
          inline
        />
      </ToolbarSection>

      <ItemAdvanceToggle propKey="spacing" title="Per-side controls">
        <div className="flex flex-col gap-1 pt-1">
          <ToolbarSection title="Padding" nested full={2} collapsible={false}>
            <UniversalInput
              propKey="pt"
              propTag="pt"
              allowedTypes={SPACING_TYPES}
              label="Top"
              labelWidth="w-12"
              showVarSelector
              inline
            />
            <UniversalInput
              propKey="pb"
              propTag="pb"
              allowedTypes={SPACING_TYPES}
              label="Bottom"
              labelWidth="w-12"
              showVarSelector
              inline
            />
            <UniversalInput
              propKey="pl"
              propTag="pl"
              allowedTypes={SPACING_TYPES}
              label="Left"
              labelWidth="w-12"
              showVarSelector
              inline
            />
            <UniversalInput
              propKey="pr"
              propTag="pr"
              allowedTypes={SPACING_TYPES}
              label="Right"
              labelWidth="w-12"
              showVarSelector
              inline
            />
          </ToolbarSection>

          <ToolbarSection title="Margin" nested full={2} collapsible={false}>
            <UniversalInput
              propKey="mt"
              propTag="mt"
              allowedTypes={SPACING_TYPES}
              label="Top"
              labelWidth="w-12"
              showVarSelector
              inline
            />
            <UniversalInput
              propKey="mb"
              propTag="mb"
              allowedTypes={SPACING_TYPES}
              label="Bottom"
              labelWidth="w-12"
              showVarSelector
              inline
            />
            <UniversalInput
              propKey="ml"
              propTag="ml"
              allowedTypes={SPACING_TYPES}
              label="Left"
              labelWidth="w-12"
              showVarSelector
              inline
            />
            <UniversalInput
              propKey="mr"
              propTag="mr"
              allowedTypes={SPACING_TYPES}
              label="Right"
              labelWidth="w-12"
              showVarSelector
              inline
            />
          </ToolbarSection>
        </div>
      </ItemAdvanceToggle>
    </>
  );
}
