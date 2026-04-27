import { Element, NodeProvider, useNode } from "@craftjs/core";
import { atom, useAtomState } from "@zedux/react";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { TableCell } from "../../../../components/TableCell";
import { CraftListEditor } from "../../inputs/preset/CraftListEditor";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const SelectedTableCellListAtom = atom<any>("selectedtablecelllist_unified", null);

export const TableRowMainTab = () => {
  const { id } = useNode();
  const [activeIndex, setActiveIndex] = useAtomState(SelectedTableCellListAtom) as unknown as [
    number | null,
    (v: number | null) => void,
  ];

  return renderComponentSlots({
    Content: (
      <ToolbarSection
        title="Cells"
        icon={SECTION_ICONS["Content"]}
        help="Add, remove, and reorder cells in this row."
      >
        <CraftListEditor
          parentId={id}
          childTypeName="TableCell"
          mapItem={node => {
            const t = node.data.props?.text || "";
            const plain = t.replace(/<[^>]*>/g, "").trim() || "Cell";
            return { label: plain, props: node.data.props };
          }}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          addLabel="Add cell"
          editTooltip="Edit cell"
          renderLabel={(item: any) => item.label}
          onAdd={({ addNode }) => {
            addNode(
              <Element
                is={TableCell}
                text="<p>—</p>"
                as="td"
                canDelete
                canEditName
                custom={{ displayName: "New Cell" }}
                className="border-base-300 border px-3 py-2 align-top"
              />
            );
          }}
          renderPopover={(item: any) => (
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
