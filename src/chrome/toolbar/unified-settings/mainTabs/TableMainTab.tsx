import { NodeProvider, useEditor, useNode } from "@craftjs/core";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { ListEditor } from "../../inputs/preset/ListItemPopover";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { atom, useAtomState, useAtomInstance } from "@zedux/react";
import { BatchOperationAtom } from "@/utils/atoms";
import { TbEdit } from "react-icons/tb";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../../primitives/layout/tooltipSurface";

export const SelectedTableSectionListAtom = atom<any>("selectedtablesectionlist_unified", null);

export const TableMainTab = () => {
  const { actions, query } = useEditor();
  const { id } = useNode();
  const [activeIndex, setActiveIndex] = useAtomState(SelectedTableSectionListAtom) as unknown as [
    number | null,
    (v: number | null) => void,
  ];
  const batchOp = useAtomInstance(BatchOperationAtom);

  const { sections } = useEditor((_, q) => {
    try {
      const node = q.node(id).get();
      const list = node.data.nodes
        .map((childId: string) => {
          try {
            const childNode = q.node(childId).get();
            if (childNode.data.name !== "TableSection") return null;
            const ts = childNode.data.props?.tableSection || "tbody";
            return {
              id: childId,
              label: `${String(ts).toUpperCase()}`,
              props: childNode.data.props,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      return { sections: list };
    } catch {
      return { sections: [] };
    }
  });

  return renderComponentSlots({
    Content: (
      <ToolbarSection
        title="Sections"
        icon={SECTION_ICONS["Content"]}
        help="Add thead, tbody, or tfoot sections. Order in the tree defines DOM order."
      >
        <ListEditor
          items={sections || []}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          addLabel="Add section"
          renderLabel={item => item.label}
          onDelete={item => actions.delete(item.id)}
          onAdd={() => {
            const Comp = query.getOptions().resolver.TableSection;
            if (Comp) {
              batchOp.setState(true);
              actions.addNodeTree(
                query
                  .parseReactElement(
                    <Comp tableSection="tbody" custom={{ displayName: "Body" }} />
                  )
                  .toNodeTree(),
                id
              );
              setActiveIndex(sections.length);
              requestAnimationFrame(() => batchOp.setState(false));
            }
          }}
          extraButtons={item => [
            <button
              key="edit"
              className="text-base-content hover:text-primary flex items-center justify-center transition-colors"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Edit section"
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
                propKey="tableSection"
                propType="component"
                type="select"
                label="Section tag"
                labelWidth="w-full"
              >
                <option value="thead">thead</option>
                <option value="tbody">tbody</option>
                <option value="tfoot">tfoot</option>
              </ToolbarItem>
            </NodeProvider>
          )}
        />
        <SettingsAiSlot />
      </ToolbarSection>
    ),
  });
};
