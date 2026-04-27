import { NodeProvider, useEditor, useNode } from "@craftjs/core";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { IconInput } from "../../inputs/media/IconInput";
import ActionInput from "../../inputs/action/ActionInput";
import { ListEditor } from "../../inputs/preset/ListEditor";
import { ToolbarSection } from "../../ToolbarSection";
import { atom, useAtomState, useAtomInstance } from "@zedux/react";
import { BatchOperationAtom } from "@/utils/atoms";
import { applyPeerClassInherit } from "../../../shell/peerInherit/applyPeerClassInherit";
import { TbEdit, TbPlus } from "react-icons/tb";
import { renderComponentSlots } from "../helpers";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../../primitives/layout/tooltipSurface";

export const SelectedButtonListItemAtom = atom<any>("selectedbuttonlistitem_unified", null);

export const ButtonListMainTab = () => {
  const { actions, query } = useEditor();
  const { id } = useNode();
  const [activeIndex, setActiveIndex] = useAtomState(SelectedButtonListItemAtom) as unknown as [
    number | null,
    (v: number | null) => void,
  ];
  const batchOp = useAtomInstance(BatchOperationAtom);

  // Get child Button nodes (excluding hamburger buttons)
  const { childButtons } = useEditor((_, q) => {
    try {
      const node = q.node(id).get();
      const childIds = node?.data?.nodes;
      if (!Array.isArray(childIds)) return { childButtons: [] };
      const buttons = childIds
        .map((childId: string) => {
          try {
            const childNode = q.node(childId).get();
            if (childNode.data.name !== "Button") return null;
            const isHamburger = childNode.data.props?.click?.value?.includes("mobile-menu");
            if (isHamburger) return null;
            return {
              id: childId,
              text: childNode.data.props.text || "Button",
              props: childNode.data.props,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      return { childButtons: buttons };
    } catch {
      return { childButtons: [] };
    }
  });

  return renderComponentSlots({
    Content: (
      <ToolbarSection collapsible={false}>
        <ListEditor
          items={childButtons || []}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          addLabel="Add Button"
          renderLabel={button => button.text}
          onDelete={button => actions.delete(button.id)}
          onAdd={() => {
            const Button = query.getOptions().resolver.Button;
            if (Button) {
              batchOp.setState(true);
              const tree = query.parseReactElement(<Button text="New Button" />).toNodeTree();
              actions.addNodeTree(tree, id);
              if (tree?.rootNodeId) {
                applyPeerClassInherit(actions, query, tree.rootNodeId, id);
              }
              setActiveIndex((childButtons ?? []).length);
              batchOp.setState(false);
            }
          }}
          extraButtons={button => [
            <button
              key="edit"
              className="text-base-content hover:text-primary flex items-center justify-center transition-colors"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Edit button"
              onClick={e => {
                e.stopPropagation();
                actions.selectNode(button.id);
              }}
            >
              <TbEdit className="h-3.5 w-3.5" />
            </button>,
          ]}
          renderPopover={button => (
            <NodeProvider id={button.id}>
              <ActionInput />
              <IconInput
                propKey="icon"
                propType="component"
                label="Icon"
                labelWidth="w-full"
                inputWidth="w-fit"
                iconOnlyLabel="Only Show Icon"
                positionLabel="Position"
                collapsible={false}
              />
            </NodeProvider>
          )}
        />
        <SettingsAiSlot />
      </ToolbarSection>
    ),
  });
};
