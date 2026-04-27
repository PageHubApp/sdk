import { Element, NodeProvider, useNode } from "@craftjs/core";
import { atom, useAtomState } from "@zedux/react";
import { TableRow } from "../../../../components/TableRow";
import { TableCell } from "../../../../components/TableCell";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { CraftListEditor } from "../../inputs/preset/CraftListEditor";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
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
  const { id } = useNode();
  const [activeIndex, setActiveIndex] = useAtomState(SelectedTableRowListAtom) as unknown as [
    number | null,
    (v: number | null) => void,
  ];

  return renderComponentSlots({
    Content: (
      <>
      <ToolbarSection
        title="Section"
        icon={SECTION_ICONS["Type"]}
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

      <ToolbarSection
        title="Rows"
        icon={SECTION_ICONS["Content"]}
        help="Add or reorder rows. New rows get the same number of cells as the first row."
      >
        <CraftListEditor
          parentId={id}
          childTypeName="TableRow"
          mapItem={node => ({
            label: node.custom?.displayName || "Row",
            props: node.data.props,
          })}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          addLabel="Add row"
          editTooltip="Edit row"
          renderLabel={(item: any) => item.label}
          onAdd={({ parentId, query, addNode }) => {
            const n = countCellsInFirstRow(query, parentId);
            addNode(
              <Element
                canvas
                is={TableRow}
                custom={{ displayName: "New Row" }}
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
            );
          }}
          renderPopover={(item: any) => (
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
      </>
    ),
  });
};
