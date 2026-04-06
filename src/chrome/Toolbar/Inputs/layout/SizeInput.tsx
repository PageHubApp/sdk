import { TbArrowsMaximize } from "react-icons/tb";
import { ItemAdvanceToggle } from "../../Helpers/ItemSelector";
import { ToolbarSection } from "../../ToolbarSection";
import { HeightInput } from "./HeightInput";
import { WidthInput } from "./WidthInput";

export const SizeInput = () => (
  <>
    <ToolbarSection
      title="Size"
      icon={<TbArrowsMaximize />}
      full={1}
      help="The maximum and minimum size this component can be."
      footer={
        <ItemAdvanceToggle propKey="size" title="More size properties">
          <ToolbarSection
            title="Max Size"
            subtitle={true}
            full={1}
            help="Maximum size this component can be."
            collapsible={false}
          >
            <WidthInput
              propKey="maxWidth"
              values="maxWidths"
              sliderValues="maxWidths"
              propTag="max-w"
            />

            <HeightInput
              propKey="maxHeight"
              values="maxHeights"
              sliderValues="maxHeights"
              propTag="max-h"
            />
          </ToolbarSection>

          <ToolbarSection
            title="Min Size"
            subtitle={true}
            full={1}
            help="Minium size this component can be."
            collapsible={false}
          >
            <WidthInput
              propKey="minWidth"
              values="minWidths"
              sliderValues="minWidths"
              propTag="min-w"
            />

            <HeightInput
              propKey="minHeight"
              values="minHeights"
              sliderValues="minHeights"
              propTag="min-h"
            />
          </ToolbarSection>
        </ItemAdvanceToggle>
      }
    >
      <WidthInput />
      <HeightInput />
    </ToolbarSection>
  </>
);
