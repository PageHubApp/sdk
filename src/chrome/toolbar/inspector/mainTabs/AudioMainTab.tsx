import { SlotRenderer } from "../../../../registry";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots } from "../helpers";

export const AudioMainTab = () => {
  return renderComponentSlots({
    Content: (
      <>
        <ToolbarSection collapsible={false}>
          <ToolbarItem
            propKey="src"
            propType="component"
            type="text"
            label="URL"
            labelHide={true}
            placeholder="https://example.com/audio.mp3"
          />
          <SlotRenderer id="settings/ai-button" />
        </ToolbarSection>

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
};
