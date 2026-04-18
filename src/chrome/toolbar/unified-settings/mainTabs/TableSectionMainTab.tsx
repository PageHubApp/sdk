import { Element, NodeProvider, useEditor, useNode } from "@craftjs/core";
import { TableRow } from "../../../../components/TableRow";
import { TableCell } from "../../../../components/TableCell";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { ListEditor } from "../../inputs/preset/ListItemPopover";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { atom, useAtomState, useAtomInstance } from "@zedux/react";
import { BatchOperationAtom } from "@/utils/atoms";
import { TbEdit } from "react-icons/tb";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const SelectedTableRowListAtom = atom<any>("selectedtablerowlist_unified", null);

function countCellsInFirstRow(query: any, sectionId: string): number {
  try {
    const node = query.node(sectionId).get();
    const rowIds = node.data.nodes || [];
    if (rowIds.length === 0) return 3;
    const firstRow = query.node(rowIds[0]).get();
    return (firstRow.data.nodes || []).length || 3;
  } catch {
    return 3;
  }
}

export const TableSectionMainTab = () => {
  const { actions, query } = useEditor();
  const { id } = useNode();
  const [activeIndex, setActiveIndex] = useAtomState(SelectedTableRowListAtom) as unknown as [
    number | null,
    (v: number | null) => void,
  ];
  const batchOp = useAtomInstance(BatchOperationAtom);

  const { rows } = useEditor((_, q) => {
    try {
      const node = q.node(id).get();
      const list = node.data.nodes
        .map((childId: string) => {
          try {
            const childNode = q.node(childId).get();
            if (childNode.data.name !== "TableRow") return null;
            return {
              id: childId,
              label: childNode.data.custom?.displayName || "Row",
              props: childNode.data.props,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      return { rows: list };
    } catch {
      return { rows: [] };
    }
  });

  return renderComponentSlots({
    Properties: (
      <ToolbarSection
        title="Section"
        icon={SECTION_ICONS["Properties"]}
        help="thead / tbody / tfoot — rows live inside this section."
      >
        <ToolbarItem
          propKey="tableSection"
          propType="component"
          type="select"
          label="Tag"
          labelWidth="w-24"
        >
          <option value="thead">thead</option>
          <option value="tbody">tbody</option>
          <option value="tfoot">tfoot</option>
        </ToolbarItem>
      </ToolbarSection>
    ),
    Content: (
      <ToolbarSection
        title="Rows"
        icon={SECTION_ICONS["Content"]}
        help="Add or reorder rows. New rows get the same number of cells as the first row."
      >
        <ListEditor
          items={rows || []}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          addLabel="Add row"
          renderLabel={item => item.label}
          onDelete={item => actions.delete(item.id)}
          onAdd={() => {
            const n = countCellsInFirstRow(query, id);
            batchOp.setState(true);
            actions.addNodeTree(
              query
                .parseReactElement(
                  <Element
                    canvas
                    is={TableRow}
                    custom={{ displayName: `Row ${(rows?.length || 0) + 1}` }}
                    canDelete
                    canEditName
                  >
                    {Array.from({ length: n }, (_, i) => (
                      <Element
                        key={i}
                        is={TableCell}
                        text="<p>—</p>"
                        as="td"
                        canDelete
                        canEditName
                        custom={{ displayName: `Cell ${i + 1}` }}
                        className="border-base-300 border px-3 py-2"
                      />
                    ))}
                  </Element>
                )
                .toNodeTree(),
              id
            );
            setActiveIndex(rows.length);
            requestAnimationFrame(() => batchOp.setState(false));
          }}
          extraButtons={item => [
            <button
              key="edit"
              className="text-base-content hover:text-primary flex items-center justify-center transition-colors"
              title="Edit row"
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
                propKey="className"
                propType="component"
                type="text"
                label="Row className"
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
