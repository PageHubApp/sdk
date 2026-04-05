// @ts-nocheck
import { PresetGroupRenderer } from "../../Inputs/preset/PresetRenderer";
import { ToolbarSection } from "../../ToolbarSection";
import { selectorPresets } from "utils/design/selectorPresets";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const SpacerMainTab = () =>
  renderComponentSlots({
    Presets: (
      <ToolbarSection title="Presets" icon={SECTION_ICONS["Presets"]}>
        <PresetGroupRenderer presets={selectorPresets.spacer} />
      </ToolbarSection>
    ),
  });
