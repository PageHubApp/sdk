import { NodeProvider, useEditor, useNode } from "@craftjs/core";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { IconInput } from "../../inputs/media/IconInput";
import ActionInput from "../../inputs/action/ActionInput";
import { ListEditor } from "../../inputs/preset/ListItemPopover";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { atom, useAtomState, useAtomInstance } from "@zedux/react";
import { BatchOperationAtom } from "@/utils/atoms";
import { TbEdit, TbLayoutNavbar, TbMenu2 } from "react-icons/tb";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const SelectedNavItemAtom = atom<any>("selectednavitem_unified", null);

const NAV_VIEW_STATES = [
  { value: "", label: "Desktop", icon: TbLayoutNavbar },
  { value: "menu", label: "Mobile Menu", icon: TbMenu2 },
] as const;

export const NavMainTab = () => {
  const { actions, query } = useEditor();
  const { id, props: nodeProps } = useNode(node => ({ props: node.data.props }));
  const [activeIndex, setActiveIndex] = useAtomState(SelectedNavItemAtom) as unknown as [
    number | null,
    (v: number | null) => void,
  ];
  const batchOp = useAtomInstance(BatchOperationAtom);

  // Read this Nav's menu prop
  const { menu } = useEditor((_, q) => {
    try {
      const node = q.node(id).get();
      return { menu: node.data.props?.menu || {} };
    } catch {
      return { menu: {} };
    }
  });

  const menuId = menu.id || "mobile-menu";

  // Get child Button nodes — exclude hamburger (click.value === menuId) and Container children (overlay)
  const { navLinks } = useEditor((_, q) => {
    try {
      const node = q.node(id).get();
      const links = node.data.nodes
        .map((childId: string) => {
          try {
            const childNode = q.node(childId).get();
            if (childNode.data.name !== "Button") return null;
            const clickValue = childNode.data.props?.click?.value;
            if (clickValue === menuId) return null;
            return {
              id: childId,
              text: childNode.data.props.text || "Link",
              props: childNode.data.props,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      return { navLinks: links };
    } catch {
      return { navLinks: [] };
    }
  });

  const currentView = nodeProps.view || "";

  return renderComponentSlots({
    Content: (
      <ToolbarSection
        title="Content"
        icon={SECTION_ICONS["Content"]}
        help="Nav links and their URLs. Switch views to edit mobile."
      >
        <div className="bg-neutral flex gap-1 rounded-lg p-1">
          {NAV_VIEW_STATES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                actions.setProp(id, (p: any) => {
                  p.view = value;
                })
              }
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                currentView === value
                  ? "bg-base-100 text-base-content shadow-sm"
                  : "text-neutral-content hover:text-base-content"
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
        <ListEditor
          items={navLinks || []}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          addLabel="Add Link"
          renderLabel={link => link.text}
          onDelete={link => actions.delete(link.id)}
          onAdd={() => {
            const Button = query.getOptions().resolver.Button;
            if (Button) {
              batchOp.setState(true);
              actions.addNodeTree(
                query
                  .parseReactElement(
                    <Button
                      text="New Link"
                      url="#"
                      className="hidden px-(--button-padding-x) py-(--button-padding-y) md:block"
                    />
                  )
                  .toNodeTree(),
                id
              );
              setActiveIndex(navLinks.length);
              requestAnimationFrame(() => batchOp.setState(false));
            }
          }}
          extraButtons={link => [
            <button
              key="edit"
              className="text-base-content hover:text-primary flex items-center justify-center transition-colors"
              title="Edit link"
              onClick={e => {
                e.stopPropagation();
                actions.selectNode(link.id);
              }}
            >
              <TbEdit className="h-3.5 w-3.5" />
            </button>,
          ]}
          renderPopover={link => (
            <NodeProvider id={link.id}>
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
    Type: (
      <ToolbarSection
        title="Mobile Menu"
        icon={SECTION_ICONS["Type"]}
        help="How the nav behaves on small screens."
      >
        <ToolbarItem propKey="menu.enabled" propType="component" type="select" label="Mobile Menu">
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </ToolbarItem>

        {menu.enabled !== false && (
          <>
            <ToolbarItem propKey="menu.type" propType="component" type="select" label="Style">
              <option value="slide">Slide Panel</option>
              <option value="fullscreen">Fullscreen</option>
              <option value="dropdown">Dropdown</option>
            </ToolbarItem>

            <ToolbarItem propKey="menu.side" propType="component" type="select" label="Side">
              <option value="left">Left</option>
              <option value="right">Right</option>
            </ToolbarItem>

            <ToolbarItem
              propKey="menu.breakpoint"
              propType="component"
              type="select"
              label="Breakpoint"
            >
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
            </ToolbarItem>
          </>
        )}
      </ToolbarSection>
    ),
  });
};
