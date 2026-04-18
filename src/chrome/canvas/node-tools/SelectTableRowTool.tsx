import { useEditor, useNode } from "@craftjs/core";
import { RenderNodeControlInline } from "../../rendering/RenderNodeControlInline";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { TbLineDashed } from "react-icons/tb";

export const SelectTableRowTool = () => {
  const { id } = useNode();
  const { query, actions } = useEditor();

  const findRowParent = (nodeId: string): string | null => {
    try {
      const node = query.node(nodeId).get();
      if (!node?.data?.parent) return null;

      const parentNode = query.node(node.data.parent).get();
      if (!parentNode) return null;

      const parentName = parentNode.data.name;
      const parentDisplayName = parentNode.data.displayName;

      if (parentName === "TableRow" || parentDisplayName === "Table Row") {
        return parentNode.id;
      }

      return findRowParent(parentNode.id);
    } catch {
      return null;
    }
  };

  const rowId = findRowParent(id);

  if (!rowId) return null;

  return (
    <RenderNodeControlInline
      key={`${id}-select-table-row`}
      position="top"
      align="end"
      className="pointer-events-auto items-center whitespace-nowrap select-none"
    >
      <div className="node-control" onMouseDown={e => e.stopPropagation()}>
        <button
          type="button"
          className="tool-button"
          onClick={() => actions.selectNode(rowId)}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Select table row"
          data-tooltip-offset={10}
        >
          <TbLineDashed />
        </button>
      </div>
    </RenderNodeControlInline>
  );
};
