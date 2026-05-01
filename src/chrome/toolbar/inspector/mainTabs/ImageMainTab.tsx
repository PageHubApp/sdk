import { useSDK } from "../../../../core/context";
import { MediaInput } from "../../inputs/media/MediaInput";
import { TailwindInput } from "../../inputs/advanced/TailwindInput";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const ImageMainTab = () => {
  const { config } = useSDK();
  return renderComponentSlots({
    Content: (
      <>
        <ToolbarSection collapsible={false}>
          <MediaInput
            propKey="videoId"
            typeKey="type"
            contentKey="src"
            variant="chip"
            label="Image"
          />
          <ToolbarItem
            propKey="alt"
            propType="component"
            type="text"
            label="Alt Text"
            placeholder="Describe this image for screen readers"
          />
          <TailwindInput propKey="objectFit" label="Object Fit" prop="objectFit" type="select" />
          <TailwindInput
            propKey="objectPosition"
            label="Object Position"
            prop="objectPosition"
            type="select"
          />
          {config.editorChromeSlots?.settingsAiButton}
        </ToolbarSection>

        <ToolbarSection
          full={1}
          title="Loading"
          icon={SECTION_ICONS["Type"]}
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
      </>
    ),
  });
};
