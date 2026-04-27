import { NodeProvider, useEditor, useNode } from "@craftjs/core";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { ListEditor } from "../../inputs/preset/ListEditor";
import { atom, useAtomState, useAtomInstance } from "@zedux/react";
import { BatchOperationAtom } from "@/utils/atoms";
import { TbEdit } from "react-icons/tb";
import { renderComponentSlots } from "../helpers";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../../primitives/layout/tooltipSurface";

export const SelectedMapPointAtom = atom<any>("selectedmappoint_unified", null);

export const MapMainTab = () => {
  const { actions, query } = useEditor();
  const { id } = useNode();
  const [activeIndex, setActiveIndex] = useAtomState(SelectedMapPointAtom) as unknown as [
    number | null,
    (v: number | null) => void,
  ];
  const batchOp = useAtomInstance(BatchOperationAtom);

  // Get child MapPoint nodes
  const { childPoints } = useEditor((_, q) => {
    try {
      const node = q.node(id).get();
      const points = node.data.nodes
        .map((childId: string) => {
          try {
            const childNode = q.node(childId).get();
            if (childNode.data.name !== "MapPoint") return null;
            return {
              id: childId,
              title: childNode.data.props.title || "",
              lat: childNode.data.props.lat || 0,
              lng: childNode.data.props.lng || 0,
              description: childNode.data.props.description || "",
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      return { childPoints: points };
    } catch {
      return { childPoints: [] };
    }
  });

  return renderComponentSlots({
    Content: (
      <ToolbarSection collapsible={false}>
        <ListEditor
          items={childPoints || []}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          addLabel="Add Point"
          renderLabel={(point, index) => point.title || `Point ${index + 1}`}
          onDelete={point => actions.delete(point.id)}
          onAdd={() => {
            const MapPoint = query.getOptions().resolver.MapPoint;
            if (MapPoint) {
              batchOp.setState(true);
              actions.addNodeTree(
                query.parseReactElement(<MapPoint title="New Point" />).toNodeTree(),
                id
              );
              setActiveIndex(childPoints.length);
              requestAnimationFrame(() => batchOp.setState(false));
            }
          }}
          extraButtons={point => [
            <button
              key="edit"
              className="text-base-content hover:text-primary flex items-center justify-center transition-colors"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Edit point"
              onClick={e => {
                e.stopPropagation();
                actions.selectNode(point.id);
              }}
            >
              <TbEdit className="h-3.5 w-3.5" />
            </button>,
          ]}
          renderPopover={point => (
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
    ),
    Properties: (
      <>
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

        <ToolbarSection title="Style" help="Visual filters like grayscale.">
          <ToolbarItem
            propKey="grayscale"
            propType="component"
            type="checkbox"
            option=""
            on="true"
            cols={true}
            labelHide={true}
            label="Grayscale"
            labelWidth="w-full"
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
