import { useEditor, useNode } from "@craftjs/core";
import { RenderNodeControlInline } from "../../rendering/RenderNodeControlInline";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { TbLayoutRows } from "react-icons/tb";

export const SelectTableSectionTool = () => {
  const { id } = useNode();
  const { query, actions } = useEditor();

  const findSectionParent = (nodeId: string): string | null => {
    try {
      const node = query.node(nodeId).get();
      if (!node?.data?.parent) return null;

      const parentNode = query.node(node.data.parent).get();
      if (!parentNode) return null;

      const parentName = parentNode.data.name;
      const parentDisplayName = parentNode.data.displayName;

      if (parentName === "TableSection" || parentDisplayName === "Table Section") {
        return parentNode.id;
      }

      return findSectionParent(parentNode.id);
    } catch {
      return null;
    }
  };

  const sectionId = findSectionParent(id);

  if (!sectionId) return null;

  return (
    <RenderNodeControlInline
      key={`${id}-select-table-section`}
      position="top"
      align="end"
      className="pointer-events-auto items-center whitespace-nowrap select-none"
    >
      <div className="node-control" onMouseDown={e => e.stopPropagation()}>
        <button
          type="button"
          className="tool-button"
          onClick={() => actions.selectNode(sectionId)}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Select table section (thead/tbody/tfoot)"
          data-tooltip-offset={10}
        >
          <TbLayoutRows />
        </button>
      </div>
    </RenderNodeControlInline>
  );
};
