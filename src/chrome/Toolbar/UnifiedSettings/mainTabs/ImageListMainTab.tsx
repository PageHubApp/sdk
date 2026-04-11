import { NodeProvider, useEditor, useNode } from "@craftjs/core";
import { SettingsAiSlot } from "../../../SettingsAiSlot";
import { MediaInput } from "../../Inputs/media/MediaInput";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { ListEditor } from "../../Inputs/preset/ListItemPopover";
import { atom, useAtomState, useAtomInstance } from "@zedux/react";
import { BatchOperationAtom } from "../../../../utils/atoms";
import { TbEdit } from "react-icons/tb";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const SelectedImageListItemAtom = atom<any>("selectedimagelistitem_unified", null);

export const ImageListMainTab = () => {
  const { actions, query } = useEditor();
  const { id, props } = useNode(node => ({ props: node.data.props }));
  const [activeIndex, setActiveIndex] = useAtomState(SelectedImageListItemAtom) as unknown as [
    number | null,
    (v: number | null) => void,
  ];
  const batchOp = useAtomInstance(BatchOperationAtom);

  // Get child Image nodes
  const { childImages } = useEditor((_, q) => {
    try {
      const node = q.node(id).get();
      const images = node.data.nodes
        .map((childId: string) => {
          try {
            const childNode = q.node(childId).get();
            if (childNode.data.name !== "Image") return null;
            return { id: childId, props: childNode.data.props };
          } catch { return null; }
        })
        .filter(Boolean);
      return { childImages: images };
    } catch { return { childImages: [] }; }
  });

  return renderComponentSlots({
    Content: (
      <ToolbarSection title="Content" icon={SECTION_ICONS["Content"]} help="Add, remove, and reorder images in this gallery.">
        <ListEditor
          items={childImages || []}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          addLabel="Add Image"
          renderLabel={(image, index) => image.props?.alt || `Image ${index + 1}`}
          onDelete={(image) => actions.delete(image.id)}
          onAdd={() => {
            const ImageComp = query.getOptions().resolver.Image;
            if (ImageComp) {
              batchOp.setState(true);
              actions.addNodeTree(
                query.parseReactElement(<ImageComp alt="New image" />).toNodeTree(),
                id
              );
              setActiveIndex(childImages.length);
              requestAnimationFrame(() => batchOp.setState(false));
            }
          }}
          extraButtons={(image) => [
            <button
              key="edit"
              className="flex items-center justify-center text-base-content transition-colors hover:text-primary"
              title="Edit image"
              onClick={e => {
                e.stopPropagation();
                actions.selectNode(image.id);
              }}
            >
              <TbEdit className="h-3.5 w-3.5" />
            </button>,
          ]}
          renderPopover={(image) => (
            <NodeProvider id={image.id}>
              <MediaInput propKey="videoId" typeKey="type" title="" collapsible={false} />
            </NodeProvider>
          )}
        />
        <SettingsAiSlot />
      </ToolbarSection>
    ),
    Properties: (
      <ToolbarSection title="Properties" icon={SECTION_ICONS["Properties"]} help="Layout mode (grid, carousel, masonry, etc) and items per row.">
        <ToolbarItem propKey="mode" propType="component" type="select" label="Mode" labelWidth="w-24">
          <option value="flex">Flex (Default)</option>
          <option value="grid">Grid</option>
          <option value="carousel">Carousel</option>
          <option value="hero">Hero</option>
          <option value="masonry">Masonry</option>
          <option value="infinite">Infinite Scroll</option>
        </ToolbarItem>
        <ToolbarItem propKey="itemsPerView" propType="component" type="select" label="Items Per View" min={1} max={6} step={1} labelWidth="w-24" />
      </ToolbarSection>
    ),
  });
};
