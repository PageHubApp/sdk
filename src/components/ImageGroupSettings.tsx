import { useEditor, useNode } from "@craftjs/core";
import { ToolbarItem, ToolbarSection } from "../chrome/toolbar";
import { TbPlus } from "react-icons/tb";

export const ImageGroupSettings = ({ onAdd }: { onAdd: () => void }) => {
  const { actions, query } = useEditor();
  const { id } = useNode();
  const { props } = useNode(node => ({
    props: node.data.props,
  }));

  return (
    <>
      <button
        className="btn w-full p-3"
        onClick={() => {
          const Image = query.getOptions().resolver.Image;
          if (Image) {
            actions.addNodeTree(
              query.parseReactElement(<Image alt="New image" />).toNodeTree(),
              id
            );
            onAdd && onAdd();
          }
        }}
      >
        <TbPlus className="mr-2 inline" /> Add Image
      </button>

      <ToolbarSection title="Properties">
        <ToolbarItem
          propKey="mode"
          propType="component"
          type="select"
          label="Mode"
          labelWidth="w-24"
        >
          <option value="flex">Flex (Default)</option>
          <option value="grid">Grid</option>
          <option value="carousel">Carousel</option>
          <option value="hero">Hero</option>
          <option value="masonry">Masonry</option>
          <option value="infinite">Infinite Scroll</option>
        </ToolbarItem>

        <ToolbarItem
          propKey="itemsPerView"
          propType="component"
          type="select"
          label={`Items Per View`}
          min={1}
          max={6}
          step={1}
          labelWidth="w-24"
        />
      </ToolbarSection>

      <ToolbarSection title="Controls" full={1}>
        <ToolbarItem
          propKey="showNavigation"
          propType="component"
          type="checkbox"
          label="Show Navigation Arrows"
          labelHide={true}
          inline
          labelWidth="w-full"
          on="enabled"
        />

        <ToolbarItem
          propKey="showDots"
          propType="component"
          type="checkbox"
          label="Show Dots Indicator"
          labelHide={true}
          inline
          labelWidth="w-full"
          on="enabled"
        />
      </ToolbarSection>

      {props?.mode === "infinite" ? (
        <>
          <ToolbarSection title="Animation" full={1}>
            <ToolbarItem
              propKey="animationEnabled"
              propType="component"
              type="checkbox"
              label="Enable Animation"
              on="enabled"
              inline
              labelWidth="w-full"
              labelHide={true}
            />
            <ToolbarItem
              propKey="previewInEditor"
              propType="component"
              type="checkbox"
              label="Preview in Editor"
              on="enabled"
              inline
              labelWidth="w-full"
              labelHide={true}
            />
          </ToolbarSection>
          {props?.animationEnabled !== false && (
            <>
              <ToolbarSection title="Scroll">
                <ToolbarItem
                  propKey="infiniteDirection"
                  propType="component"
                  type="select"
                  label="Direction"
                >
                  <option value="left">Scroll Left ←</option>
                  <option value="right">Scroll Right →</option>
                </ToolbarItem>

                <ToolbarItem
                  propKey="infiniteSpeed"
                  propType="component"
                  type="select"
                  label="Speed"
                  min={5}
                  max={120}
                  step={1}
                  description="Time for one complete scroll (lower = faster)"
                />
              </ToolbarSection>
            </>
          )}
        </>
      ) : (
        <ToolbarSection title="Auto-Scroll">
          <ToolbarItem
            propKey="autoScroll"
            propType="component"
            type="checkbox"
            label="Enable"
            labelHide={true}
            labelWidth="w-full"
          />

          {props?.autoScroll && (
            <ToolbarItem
              propKey="autoScrollInterval"
              propType="component"
              type="number"
              label="Interval (ms)"
              placeholder="3000"
              min={1000}
              max={10000}
              step={500}
              labelHide={true}
            />
          )}
        </ToolbarSection>
      )}
    </>
  );
};
