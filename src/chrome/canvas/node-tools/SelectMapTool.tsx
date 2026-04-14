import { useEditor, useNode } from "@craftjs/core";
import { RenderNodeControlInline } from "../../rendering/RenderNodeControlInline";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
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
      className="pointer-events-auto items-center whitespace-nowrap select-none"
    >
      <div className="node-control" onMouseDown={e => e.stopPropagation()}>
        <button
          type="button"
          className="tool-button"
          onClick={handleSelectMap}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Select Map"
          data-tooltip-offset={10}
        >
          <TbMap2 />
        </button>
      </div>
    </RenderNodeControlInline>
  );
};
