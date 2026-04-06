import { PresetGroupRenderer } from "../../Inputs/preset/PresetRenderer";
import { ToolbarSection } from "../../ToolbarSection";
import { selectorPresets } from "utils/design/selectorPresets";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const SpacerMainTab = () =>
  renderComponentSlots({
    Presets: (
      <ToolbarSection title="Presets" icon={SECTION_ICONS["Presets"]} help="Quick-apply spacer sizes.">
        <PresetGroupRenderer presets={selectorPresets.spacer} />
      </ToolbarSection>
    ),
  });
