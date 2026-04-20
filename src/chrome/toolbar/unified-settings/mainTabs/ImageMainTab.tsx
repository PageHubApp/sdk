import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { MediaInput } from "../../inputs/media/MediaInput";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const ImageMainTab = () =>
  renderComponentSlots({
    Content: (
      <ToolbarSection
        title="Content"
        icon={SECTION_ICONS["Content"]}
        help="Upload or link the image source."
      >
        <MediaInput
          propKey="videoId"
          typeKey="type"
          contentKey="src"
          title=""
          collapsible={false}
        />
        <SettingsAiSlot />
      </ToolbarSection>
    ),
    Properties: (
      <ToolbarSection
        full={1}
        title="Properties"
        icon={SECTION_ICONS["Properties"]}
        help="Preload important images, like the first ones on the page. Lazy load images that are below the first page."
      >
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
