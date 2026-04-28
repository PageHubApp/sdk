import { NodeProvider, useNode } from "@craftjs/core";
import { atom, useAtomState } from "@zedux/react";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { MediaInput } from "../../inputs/media/MediaInput";
import { CraftListEditor } from "../../inputs/preset/CraftListEditor";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const SelectedImageListItemAtom = atom<any>("selectedimagelistitem_unified", null);

export const ImageListMainTab = () => {
  const { id, props } = useNode(node => ({ props: node.data?.props }));
  const [activeIndex, setActiveIndex] = useAtomState(SelectedImageListItemAtom) as unknown as [
    number | null,
    (v: number | null) => void,
  ];

  const isCarousel = props.mode === "carousel" || props.mode === "hero";

  return renderComponentSlots({
    Content: (
      <>
      <ToolbarSection collapsible={false}>
        <CraftListEditor
          parentId={id}
          childTypeName="Image"
          mapItem={node => ({ props: node.data.props })}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          addLabel="Add Image"
          editTooltip="Edit image"
          renderLabel={(image: any, index) => image.props?.alt || `Image ${index + 1}`}
          onAdd={({ query, addNode }) => {
            const ImageComp = query.getOptions().resolver.Image;
            if (ImageComp) addNode(<ImageComp alt="New image" />);
          }}
          renderPopover={(image: any) => (
            <NodeProvider id={image.id}>
              <MediaInput propKey="videoId" typeKey="type" variant="chip" label="Image" />
            </NodeProvider>
          )}
        />
        <SettingsAiSlot />
      </ToolbarSection>

      <ToolbarSection
        title="Layout"
        icon={SECTION_ICONS["Type"]}
        help="Layout mode (grid, carousel, masonry, etc) and items per row."
      >
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
          label="Items Per View"
          min={1}
          max={6}
          step={1}
          labelWidth="w-24"
        />
      </ToolbarSection>

      {isCarousel && (
            <ToolbarSection
              title="Carousel"
              icon={SECTION_ICONS["Type"]}
              help="Carousel navigation and autoplay settings."
            >
              <ToolbarItem
                propKey="showNavigation"
                propType="component"
                type="toggle"
                label="Show Arrows"
                labelWidth="w-24"
              />
              <ToolbarItem
                propKey="showDots"
                propType="component"
                type="toggle"
                label="Show Dots"
                labelWidth="w-24"
              />
              <ToolbarItem
                propKey="autoScroll"
                propType="component"
                type="toggle"
                label="Auto Scroll"
                labelWidth="w-24"
              />
              <ToolbarItem
                propKey="autoScrollInterval"
                propType="component"
                type="number"
                label="Interval (ms)"
                labelWidth="w-24"
                min={1000}
                max={10000}
                step={500}
              />
              <ToolbarItem
                propKey="navArrowClass"
                propType="component"
                type="text"
                label="Arrow Classes"
                labelWidth="w-24"
                placeholder="bg-base-100/80 text-base-content..."
              />
              <ToolbarItem
                propKey="navDotClass"
                propType="component"
                type="text"
                label="Dot Classes"
                labelWidth="w-24"
                placeholder="bg-base-100/50"
              />
              <ToolbarItem
                propKey="navDotActiveClass"
                propType="component"
                type="text"
                label="Active Dot"
                labelWidth="w-24"
                placeholder="bg-base-100 w-8"
              />
            </ToolbarSection>
      )}
      </>
    ),
  });
};
