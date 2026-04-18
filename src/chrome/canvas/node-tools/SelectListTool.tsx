import { useEditor, useNode } from "@craftjs/core";
import { RenderNodeControlInline } from "../../rendering/RenderNodeControlInline";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { TbList } from "react-icons/tb";

export const SelectListTool = () => {
  const { id } = useNode();
  const { query, actions } = useEditor();

  const findListParent = (nodeId: string): string | null => {
    try {
      const node = query.node(nodeId).get();
      if (!node?.data?.parent) return null;

      const parentNode = query.node(node.data.parent).get();
      if (!parentNode) return null;

      const parentName = parentNode.data.name;
      const parentDisplayName = parentNode.data.displayName;

      if (parentName === "List" || parentDisplayName === "List") {
        return parentNode.id;
      }

      return findListParent(parentNode.id);
    } catch {
      return null;
    }
  };

  const listId = findListParent(id);

  if (!listId) return null;

  const handleSelectList = () => {
    actions.selectNode(listId);
  };

  return (
    <RenderNodeControlInline
      key={`${id}-select-list`}
      position="top"
      align="end"
      className="pointer-events-auto items-center whitespace-nowrap select-none"
    >
      <div className="node-control" onMouseDown={e => e.stopPropagation()}>
        <button
          type="button"
          className="tool-button"
          onClick={handleSelectList}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Select list container"
          data-tooltip-offset={10}
        >
          <TbList />
        </button>
      </div>
    </RenderNodeControlInline>
  );
};
