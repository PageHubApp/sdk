import { NodeProvider, useEditor, useNode } from "@craftjs/core";
import { IconInput } from "../../Inputs/media/IconInput";
import ActionInput from "../../Inputs/action/ActionInput";
import { ListEditor } from "../../Inputs/preset/ListItemPopover";
import { ToolbarSection } from "../../ToolbarSection";
import { atom, useAtomState, useAtomInstance } from "@zedux/react";
import { BatchOperationAtom } from "../../../../utils/atoms";
import { TbEdit, TbPlus } from "react-icons/tb";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const SelectedButtonListItemAtom = atom("selectedbuttonlistitem_unified", null);

export const ButtonListMainTab = () => {
  const { actions, query } = useEditor();
  const { id } = useNode();
  const [activeIndex, setActiveIndex] = useAtomState(SelectedButtonListItemAtom);
  const batchOp = useAtomInstance(BatchOperationAtom);

  // Get child Button nodes (excluding hamburger buttons)
  const { childButtons } = useEditor((_, q) => {
    try {
      const node = q.node(id).get();
      const buttons = node.data.nodes
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
          } catch { return null; }
        })
        .filter(Boolean);
      return { childButtons: buttons };
    } catch { return { childButtons: [] }; }
  });

  return renderComponentSlots({
    Content: (
      <ToolbarSection title="Content" icon={SECTION_ICONS["Content"]} help="Add, remove, and reorder buttons in this group.">
        <ListEditor
          items={childButtons || []}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          addLabel="Add Button"
          renderLabel={(button) => button.text}
          onDelete={(button) => actions.delete(button.id)}
          onAdd={() => {
            const Button = query.getOptions().resolver.Button;
            if (Button) {
              batchOp.setState(true);
              actions.addNodeTree(
                query.parseReactElement(<Button text="New Button" />).toNodeTree(),
                id
              );
              setActiveIndex(childButtons.length);
              requestAnimationFrame(() => batchOp.setState(false));
            }
          }}
          extraButtons={(button) => [
            <button
              key="edit"
              className="flex items-center justify-center text-base-content transition-colors hover:text-primary"
              title="Edit button"
              onClick={e => {
                e.stopPropagation();
                actions.selectNode(button.id);
              }}
            >
              <TbEdit className="h-3.5 w-3.5" />
            </button>,
          ]}
          renderPopover={(button) => (
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
      </ToolbarSection>
    ),
  });
};
