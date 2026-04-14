import { useEditor, useNode } from "@craftjs/core";
import { RenderNodeControlInline } from "../../rendering/RenderNodeControlInline";
import { Tooltip } from "@/chrome/primitives/layout/Tooltip";
import { TbPhotoCog } from "react-icons/tb";

export const SelectImageListTool = () => {
  const { id } = useNode();
  const { query, actions } = useEditor();

  // Find the ImageList parent
  const findImageListParent = (nodeId: string): string | null => {
    try {
      const node = query.node(nodeId).get();
      if (!node?.data?.parent) return null;

      const parentNode = query.node(node.data.parent).get();
      if (!parentNode) return null;

      const parentName = parentNode.data.name;
      const parentDisplayName = parentNode.data.displayName;

      if (parentName === "ImageList" || parentDisplayName === "ImageList") {
        return parentNode.id;
      }

      return findImageListParent(parentNode.id);
    } catch (e) {
      return null;
    }
  };

  const imageListId = findImageListParent(id);

  if (!imageListId) return null;

  const handleSelectImageList = () => {
    actions.selectNode(imageListId);
  };

  return (
    <RenderNodeControlInline
      key={`${id}-select-image-list`}
      position="right"
      align="middle"
      className="pointer-events-auto items-center whitespace-nowrap select-none"
    >
      <div className="node-control" onMouseDown={e => e.stopPropagation()}>
        <Tooltip content="Select Image List">
          <button type="button" className="tool-button" onClick={handleSelectImageList}>
            <TbPhotoCog />
          </button>
        </Tooltip>
      </div>
    </RenderNodeControlInline>
  );
};
