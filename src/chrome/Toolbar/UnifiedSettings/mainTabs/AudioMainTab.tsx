import { SettingsAiSlot } from "../../../SettingsAiSlot";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const AudioMainTab = () =>
  renderComponentSlots({
    Content: (
      <ToolbarSection title="Content" icon={SECTION_ICONS["Content"]} help="URL to the audio file.">
        <ToolbarItem
          propKey="src"
          propType="component"
          type="text"
          label="URL"
          labelHide={true}
          placeholder="https://example.com/audio.mp3"
        />
        <SettingsAiSlot />
      </ToolbarSection>
    ),
    Properties: (
      <>
        <ToolbarSection title="Playback Options" help="Controls, autoplay, and loop settings.">
          <ToolbarItem
            propKey="controls"
            propType="component"
            type="checkbox"
            label="Show Controls"
            labelWidth="w-full"
            inputWidth="w-fit"
          />
          <ToolbarItem
            propKey="autoPlay"
            propType="component"
            type="checkbox"
            label="Autoplay"
            labelWidth="w-full"
            inputWidth="w-fit"
          />
          <ToolbarItem
            propKey="loop"
            propType="component"
            type="checkbox"
            label="Loop"
            labelWidth="w-full"
            inputWidth="w-fit"
          />
        </ToolbarSection>

        <ToolbarSection title="Accessibility" help="Title for screen readers.">
          <ToolbarItem
            propKey="title"
            propType="component"
            type="text"
            label="Title"
            placeholder="Audio description"
          />
        </ToolbarSection>
      </>
    ),
  });
