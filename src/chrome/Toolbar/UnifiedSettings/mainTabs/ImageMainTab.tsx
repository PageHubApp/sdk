import { SettingsAiSlot } from "../../../SettingsAiSlot";
import { MediaInput } from "../../Inputs/media/MediaInput";
import { PresetGroupRenderer } from "../../Inputs/preset/PresetRenderer";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { selectorPresets } from "utils/design/selectorPresets";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const ImageMainTab = () =>
  renderComponentSlots({
    Content: (
      <ToolbarSection title="Content" icon={SECTION_ICONS["Content"]} help="Upload or link the image source.">
        <MediaInput propKey="videoId" typeKey="type" contentKey="content" title="" collapsible={false} />
        <SettingsAiSlot />
      </ToolbarSection>
    ),
    Presets: (
      <ToolbarSection title="Presets" icon={SECTION_ICONS["Presets"]} help="Quick-apply image styles.">
        <PresetGroupRenderer presets={selectorPresets.image} />
      </ToolbarSection>
    ),
    Properties: (
      <ToolbarSection
        full={1}
        title="Properties"
        icon={SECTION_ICONS["Properties"]}
        help="Preload important images, like the first ones on the page. Lazy load images that are below the first page."
      >
        <ToolbarItem
          propKey="priority"
          propType="component"
          type="checkbox"
          option=""
          on="priority"
          cols={true}
          labelHide={true}
          label="Preload"
          labelWidth="w-full"
        />
        <ToolbarItem propKey="loading" propType="component" type="select" label="Loading">
          <option value="lazy">lazy</option>
          <option value="eager">eager</option>
        </ToolbarItem>
        <ToolbarItem propKey="fetchPriority" propType="component" type="select" label="Priority">
          <option value="low">Low</option>
          <option value="high">High</option>
          <option value="">Auto</option>
        </ToolbarItem>
      </ToolbarSection>
    ),
  });
