import { NodeProvider, useNode } from "@craftjs/core";
import { atom, useAtomState } from "@zedux/react";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { IconInput } from "../../inputs/media/IconInput";
import ActionInput from "../../inputs/action/ActionInput";
import { CraftListEditor } from "../../inputs/preset/CraftListEditor";
import { ToolbarSection } from "../../ToolbarSection";
import { applyPeerClassInherit } from "../../../shell/peerInherit/applyPeerClassInherit";
import { renderComponentSlots } from "../helpers";

export const SelectedButtonListItemAtom = atom<any>("selectedbuttonlistitem_unified", null);

export const ButtonListMainTab = () => {
  const { id } = useNode();
  const [activeIndex, setActiveIndex] = useAtomState(SelectedButtonListItemAtom) as unknown as [
    number | null,
    (v: number | null) => void,
  ];

  return renderComponentSlots({
    Content: (
      <ToolbarSection collapsible={false}>
        <CraftListEditor
          parentId={id}
          childTypeName="Button"
          filterChild={node => !node.data.props?.click?.value?.includes("mobile-menu")}
          mapItem={node => ({ text: node.data.props.text || "Button" })}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          addLabel="Add Button"
          editTooltip="Edit button"
          renderLabel={(button: any) => button.text}
          onAdd={({ parentId, query, actions, addNode }) => {
            const Button = query.getOptions().resolver.Button;
            if (!Button) return;
            const newId = addNode(<Button text="New Button" />);
            if (newId) applyPeerClassInherit(actions, query, newId, parentId);
          }}
          renderPopover={(button: any) => (
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
