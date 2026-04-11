import { SettingsAiSlot } from "../../../SettingsAiSlot";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots } from "../helpers";

export const MapPointMainTab = () =>
  renderComponentSlots({
    Content: (
      <>
        <SettingsAiSlot />
        <ToolbarSection title="Location" help="Latitude and longitude for this pin.">
          <ToolbarItem
            propKey="lat"
            propType="component"
            type="number"
            label="Latitude"
            labelHide={false}
            placeholder="e.g. 51.505"
          />
          <ToolbarItem
            propKey="lng"
            propType="component"
            type="number"
            label="Longitude"
            labelHide={false}
            placeholder="e.g. -0.09"
          />
        </ToolbarSection>

        <ToolbarSection title="Details" help="Name and description shown in the pin popup.">
          <ToolbarItem
            propKey="title"
            propType="component"
            type="text"
            label="Title"
            labelHide={false}
            placeholder="Location name"
          />
          <ToolbarItem
            propKey="description"
            propType="component"
            type="text"
            label="Description"
            labelHide={false}
            placeholder="Brief description"
          />
        </ToolbarSection>
      </>
    ),
  });
