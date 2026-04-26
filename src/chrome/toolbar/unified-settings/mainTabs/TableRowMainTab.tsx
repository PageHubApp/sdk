import { Element, NodeProvider, useEditor, useNode } from "@craftjs/core";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { ListEditor } from "../../inputs/preset/ListItemPopover";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { atom, useAtomState, useAtomInstance } from "@zedux/react";
import { BatchOperationAtom } from "@/utils/atoms";
import { TbEdit } from "react-icons/tb";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";
import { TableCell } from "../../../../components/TableCell";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../../primitives/layout/tooltipSurface";

export const SelectedTableCellListAtom = atom<any>("selectedtablecelllist_unified", null);

export const TableRowMainTab = () => {
  const { actions, query } = useEditor();
  const { id } = useNode();
  const [activeIndex, setActiveIndex] = useAtomState(SelectedTableCellListAtom) as unknown as [
    number | null,
    (v: number | null) => void,
  ];
  const batchOp = useAtomInstance(BatchOperationAtom);

  const { cells } = useEditor((_, q) => {
    try {
      const node = q.node(id).get();
      const list = node.data.nodes
        .map((childId: string) => {
          try {
            const childNode = q.node(childId).get();
            if (childNode.data.name !== "TableCell") return null;
            const t = childNode.data.props?.text || "";
            const plain = t.replace(/<[^>]*>/g, "").trim() || "Cell";
            return {
              id: childId,
              label: plain,
              props: childNode.data.props,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      return { cells: list };
    } catch {
      return { cells: [] };
    }
  });

  return renderComponentSlots({
    Content: (
      <ToolbarSection
        title="Cells"
        icon={SECTION_ICONS["Content"]}
        help="Add, remove, and reorder cells in this row."
      >
        <ListEditor
          items={cells || []}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          addLabel="Add cell"
          renderLabel={item => item.label}
          onDelete={item => actions.delete(item.id)}
          onAdd={() => {
            batchOp.setState(true);
            actions.addNodeTree(
              query
                .parseReactElement(
                  <Element
                    is={TableCell}
                    text="<p>—</p>"
                    as="td"
                    canDelete
                    canEditName
                    custom={{ displayName: `Cell ${(cells?.length || 0) + 1}` }}
                    className="border-base-300 border px-3 py-2 align-top"
                  />
                )
                .toNodeTree(),
              id
            );
            setActiveIndex(cells.length);
            requestAnimationFrame(() => batchOp.setState(false));
          }}
          extraButtons={item => [
            <button
              key="edit"
              className="text-base-content hover:text-primary flex items-center justify-center transition-colors"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Edit cell"
              onClick={e => {
                e.stopPropagation();
                actions.selectNode(item.id);
              }}
            >
              <TbEdit className="h-3.5 w-3.5" />
            </button>,
          ]}
          renderPopover={item => (
            <NodeProvider id={item.id}>
              <ToolbarItem
                propKey="text"
                propType="component"
                type="textarea"
                label="Text"
                labelWidth="w-full"
              />
            </NodeProvider>
          )}
        />
        <SettingsAiSlot />
      </ToolbarSection>
    ),
  });
};
