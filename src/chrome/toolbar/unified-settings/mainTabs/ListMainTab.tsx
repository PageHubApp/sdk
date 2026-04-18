import { NodeProvider, useEditor, useNode } from "@craftjs/core";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { IconDialogInput } from "../../inputs/media/IconDialogInput";
import { ListEditor } from "../../inputs/preset/ListItemPopover";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { atom, useAtomState, useAtomInstance } from "@zedux/react";
import { BatchOperationAtom } from "@/utils/atoms";
import { TbEdit } from "react-icons/tb";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const SelectedListItemAtom = atom<any>("selectedlistitem_unified", null);

export const ListMainTab = () => {
  const { actions, query } = useEditor();
  const { id } = useNode();
  const [activeIndex, setActiveIndex] = useAtomState(SelectedListItemAtom) as unknown as [
    number | null,
    (v: number | null) => void,
  ];
  const batchOp = useAtomInstance(BatchOperationAtom);

  const { childItems } = useEditor((_, q) => {
    try {
      const node = q.node(id).get();
      const items = node.data.nodes
        .map((childId: string) => {
          try {
            const childNode = q.node(childId).get();
            if (childNode.data.name !== "ListItem") return null;
            const t = childNode.data.props?.text || "";
            const plain = t.replace(/<[^>]*>/g, "").trim() || "List item";
            return { id: childId, label: plain, props: childNode.data.props };
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      return { childItems: items };
    } catch {
      return { childItems: [] };
    }
  });

  const { props: listProps } = useNode(node => ({ props: node.data?.props }));
  const isOrdered = listProps?.ordered === true;

  return renderComponentSlots({
    Content: (
      <ToolbarSection
        title="Content"
        icon={SECTION_ICONS["Content"]}
        help="Add, remove, and reorder list items."
      >
        <ListEditor
          items={childItems || []}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          addLabel="Add item"
          renderLabel={item => item.label}
          onDelete={item => actions.delete(item.id)}
          onAdd={() => {
            const Comp = query.getOptions().resolver.ListItem;
            if (Comp) {
              batchOp.setState(true);
              actions.addNodeTree(
                query.parseReactElement(<Comp text="<p>New item</p>" />).toNodeTree(),
                id
              );
              setActiveIndex(childItems.length);
              requestAnimationFrame(() => batchOp.setState(false));
            }
          }}
          extraButtons={item => [
            <button
              key="edit"
              className="text-base-content hover:text-primary flex items-center justify-center transition-colors"
              title="Edit item"
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
    Properties: (
      <ToolbarSection
        title="List"
        icon={SECTION_ICONS["Properties"]}
        help="Ordered numbering or custom markers for unordered lists."
      >
        <ToolbarItem
          propKey="ordered"
          propType="component"
          type="toggle"
          label="Ordered (1, 2, 3)"
          labelWidth="w-36"
        />
        {!isOrdered && (
          <>
            <ToolbarItem
              propKey="markerStyle"
              propType="component"
              type="select"
              label="Marker"
              labelWidth="w-36"
            >
              <option value="check">Check</option>
              <option value="bullet">Bullet</option>
              <option value="dash">Dash</option>
              <option value="icon">Icon</option>
            </ToolbarItem>
            {listProps?.markerStyle === "icon" && (
              <>
                <IconDialogInput
                  propKey="markerIcon.value"
                  propType="component"
                  label="Marker icon"
                  labelWidth="w-full"
                  inputWidth="w-fit"
                />
                <ToolbarItem
                  propKey="markerIcon.size"
                  propType="component"
                  type="text"
                  label="Icon size (Tailwind)"
                  labelWidth="w-36"
                  placeholder="w-5 h-5"
                />
              </>
            )}
          </>
        )}
      </ToolbarSection>
    ),
  });
};
