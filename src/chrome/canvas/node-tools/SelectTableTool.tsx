import { useEditor, useNode } from "@craftjs/core";
import { RenderNodeControlInline } from "../../rendering/RenderNodeControlInline";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { TbTable } from "react-icons/tb";

export const SelectTableTool = () => {
  const { id } = useNode();
  const { query, actions } = useEditor();

  const findTableParent = (nodeId: string): string | null => {
    try {
      const node = query.node(nodeId).get();
      if (!node?.data?.parent) return null;

      const parentNode = query.node(node.data.parent).get();
      if (!parentNode) return null;

      const parentName = parentNode.data.name;
      const parentDisplayName = parentNode.data.displayName;

      if (parentName === "Table" || parentDisplayName === "Table") {
        return parentNode.id;
      }

      return findTableParent(parentNode.id);
    } catch {
      return null;
    }
  };

  const tableId = findTableParent(id);

  if (!tableId) return null;

  return (
    <RenderNodeControlInline
      key={`${id}-select-table`}
      position="top"
      align="end"
      className="pointer-events-auto items-center whitespace-nowrap select-none"
    >
      <div className="node-control" onMouseDown={e => e.stopPropagation()}>
        <button
          type="button"
          className="tool-button"
          onClick={() => actions.selectNode(tableId)}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Select table"
          data-tooltip-offset={10}
        >
          <TbTable />
        </button>
      </div>
    </RenderNodeControlInline>
  );
};
