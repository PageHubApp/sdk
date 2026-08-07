import { SlotRenderer } from "../../../../registry";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots } from "../helpers";

export const MapPathMainTab = () => {
  return renderComponentSlots({
    Content: (
      <>
        <SlotRenderer id="settings/ai-button" />
        <ToolbarSection
          title="Route"
          help="One lat,lng pair per line, in the order a driver travels them. Two or more points draw a line."
        >
          <ToolbarItem
            propKey="path"
            propType="component"
            type="textarea"
            label="Points"
            labelHide={false}
            placeholder={"34.16124,-118.30049\n34.16143,-118.30046\n34.16158,-118.30041"}
          />
        </ToolbarSection>

        <ToolbarSection title="Line" help="How the route line is drawn on the map.">
          <ToolbarItem
            propKey="color"
            propType="component"
            type="text"
            label="Colour"
            labelHide={false}
            placeholder="var(--color-primary)"
          />
          <ToolbarItem
            propKey="weight"
            propType="component"
            type="number"
            label="Thickness"
            labelHide={false}
            placeholder="4"
          />
          <ToolbarItem
            propKey="opacity"
            propType="component"
            type="number"
            label="Opacity"
            labelHide={false}
            placeholder="1"
          />
          <ToolbarItem
            propKey="dashed"
            propType="component"
            type="checkbox"
            label="Dashed"
            labelHide={false}
          />
        </ToolbarSection>

        <ToolbarSection
          title="Details"
          help="Label is drawn on the map itself. Title is the accessible name only — leave it blank to reuse the label."
        >
          <ToolbarItem
            propKey="label"
            propType="component"
            type="text"
            label="Label"
            labelHide={false}
            placeholder="Enter here"
          />
          <ToolbarItem
            propKey="title"
            propType="component"
            type="text"
            label="Title"
            labelHide={false}
            placeholder="Route in from the street"
          />
        </ToolbarSection>
      </>
    ),
  });
};
