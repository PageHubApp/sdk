import { useEditor, useNode } from "@craftjs/core";
import { RenderNodeControlInline } from "../../RenderNodeControlInline";
import { Tooltip } from "components/layout/Tooltip";
import { TbMap2 } from "react-icons/tb";

export const SelectMapTool = () => {
  const { id } = useNode();
  const { query, actions } = useEditor();

  // Find the Map parent
  const findMapParent = (nodeId: string): string | null => {
    try {
      const node = query.node(nodeId).get();
      if (!node?.data?.parent) return null;

      const parentNode = query.node(node.data.parent).get();
      if (!parentNode) return null;

      const parentName = parentNode.data.name;
      const parentDisplayName = parentNode.data.displayName;

      if (parentName === "Map" || parentDisplayName === "Map") {
        return parentNode.id;
      }

      return findMapParent(parentNode.id);
    } catch (e) {
      return null;
    }
  };

  const mapId = findMapParent(id);

  if (!mapId) return null;

  const handleSelectMap = () => {
    actions.selectNode(mapId);
  };

  return (
    <RenderNodeControlInline
      key={`${id}-select-map`}
      position="right"
      align="middle"
      className="pointer-events-auto select-none items-center whitespace-nowrap"
    >
      <div className="node-control" onMouseDown={e => e.stopPropagation()}>
        <Tooltip content="Select Map">
          <button type="button" className="tool-button" onClick={handleSelectMap}>
            <TbMap2 />
          </button>
        </Tooltip>
      </div>
    </RenderNodeControlInline>
  );
};

