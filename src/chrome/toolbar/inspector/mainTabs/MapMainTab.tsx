import { NodeProvider, useNode } from "@craftjs/core";
import { atom, useAtomState } from "@zedux/react";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { CraftListEditor } from "../../inputs/preset/CraftListEditor";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots } from "../helpers";

export const SelectedMapPointAtom = atom<any>("selectedmappoint_unified", null);

export const MapMainTab = () => {
  const { id } = useNode();
  const [activeIndex, setActiveIndex] = useAtomState(SelectedMapPointAtom) as unknown as [
    number | null,
    (v: number | null) => void,
  ];

  return renderComponentSlots({
    Content: (
      <>
        <ToolbarSection collapsible={false}>
          <CraftListEditor
            parentId={id}
            childTypeName="MapPoint"
            mapItem={node => ({
              title: node.data.props.title || "",
              lat: node.data.props.lat || 0,
              lng: node.data.props.lng || 0,
              description: node.data.props.description || "",
            })}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            addLabel="Add Point"
            editTooltip="Edit point"
            renderLabel={(point: any, index) => point.title || `Point ${index + 1}`}
            onAdd={({ query, addNode }) => {
              const MapPoint = query.getOptions().resolver.MapPoint;
              if (MapPoint) addNode(<MapPoint title="New Point" />);
            }}
            renderPopover={(point: any) => (
              <NodeProvider id={point.id}>
                <ToolbarSection title="Location">
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
                <ToolbarSection title="Details">
                  <ToolbarItem
                    propKey="description"
                    propType="component"
                    type="text"
                    label="Description"
                    labelHide={false}
                    placeholder="Brief description"
                  />
                </ToolbarSection>
              </NodeProvider>
            )}
          />
          <SettingsAiSlot />
        </ToolbarSection>

        <ToolbarSection
          title="Map Settings"
          help="Interactive, static, or background display mode."
        >
          <ToolbarItem
            propKey="type"
            propType="component"
            type="select"
            label="Display Type"
            labelHide={false}
          >
            <option value="interactive">Interactive</option>
            <option value="static">Static</option>
            <option value="background">Background</option>
          </ToolbarItem>
          <ToolbarItem
            propKey="tileStyle"
            propType="component"
            type="select"
            label="Tile Style"
            labelHide={false}
          >
            <option value="osm">OpenStreetMap</option>
            <option value="cartodb-positron">Light (Positron)</option>
            <option value="cartodb-dark">Dark</option>
            <option value="cartodb-voyager">Voyager</option>
          </ToolbarItem>
        </ToolbarSection>

        <ToolbarSection title="Center Position" help="Where the map is centered by default.">
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
          <ToolbarItem
            propKey="zoom"
            propType="component"
            type="number"
            label="Zoom (1-20)"
            labelHide={false}
            placeholder="13"
          />
        </ToolbarSection>

        <ToolbarSection title="Accessibility" help="Title for screen readers.">
          <ToolbarItem
            propKey="title"
            propType="component"
            type="text"
            label="Map Title"
            labelHide={false}
            placeholder="Describe the map content"
          />
        </ToolbarSection>
      </>
    ),
  });
};
