import { useEditor, useNode } from "@craftjs/core";
import { RenderNodeControlInline } from "../../RenderNodeControlInline";
import { Tooltip } from "components/layout/Tooltip";
import { TbServerCog } from "react-icons/tb";

export const SelectButtonListTool = () => {
  const { id } = useNode();
  const { query, actions } = useEditor();

  // Find the ButtonList parent
  const findButtonListParent = (nodeId: string): string | null => {
    try {
      const node = query.node(nodeId).get();
      if (!node?.data?.parent) return null;

      const parentNode = query.node(node.data.parent).get();
      if (!parentNode) return null;

      const parentName = parentNode.data.name;
      const parentDisplayName = parentNode.data.displayName;

      if (parentName === "ButtonList" || parentDisplayName === "ButtonList") {
        return parentNode.id;
      }

      return findButtonListParent(parentNode.id);
    } catch (e) {
      return null;
    }
  };

  const buttonListId = findButtonListParent(id);

  if (!buttonListId) return null;

  const handleSelectButtonList = () => {
    actions.selectNode(buttonListId);
  };

  return (
    <RenderNodeControlInline
      key={`${id}-select-button-list`}
      position="top"
      align="end"
      className="pointer-events-auto select-none items-center whitespace-nowrap"
    >
      <div className="node-control" onMouseDown={e => e.stopPropagation()}>
        <Tooltip content="Select List Container">
          <button type="button" className="tool-button" onClick={handleSelectButtonList}>
            <TbServerCog />
          </button>
        </Tooltip>
      </div>
    </RenderNodeControlInline>
  );
};

export default SelectButtonListTool;
