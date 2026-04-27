import { NodeProvider, useEditor, useNode } from "@craftjs/core";
import { atom, useAtomState } from "@zedux/react";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { IconInput } from "../../inputs/media/IconInput";
import { ActionsInput } from "../../inputs/action/ActionsInput";
import { CraftListEditor } from "../../inputs/preset/CraftListEditor";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { TbLayoutNavbar, TbMenu2 } from "react-icons/tb";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const SelectedNavItemAtom = atom<any>("selectednavitem_unified", null);

const NAV_VIEW_STATES = [
  { value: "", label: "Desktop", icon: TbLayoutNavbar },
  { value: "menu", label: "Mobile Menu", icon: TbMenu2 },
] as const;

export const NavMainTab = () => {
  const { actions } = useEditor();
  const { id, props: nodeProps } = useNode(node => ({ props: node.data?.props }));
  const [activeIndex, setActiveIndex] = useAtomState(SelectedNavItemAtom) as unknown as [
    number | null,
    (v: number | null) => void,
  ];

  // Read this Nav's menu prop (the mobile-menu container's id, used to filter
  // out the hamburger button from the visible link list).
  const { menu } = useEditor((_, q) => {
    try {
      const node = q.node(id).get();
      return { menu: node.data?.props?.menu || {} };
    } catch {
      return { menu: {} };
    }
  });

  const menuId = menu.id || "mobile-menu";
  const currentView = nodeProps.view || "";

  return renderComponentSlots({
    Content: (
      <ToolbarSection collapsible={false}>
        <div className="bg-neutral flex gap-1 rounded-md p-1">
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
        <CraftListEditor
          parentId={id}
          childTypeName="Button"
          filterChild={node => node.data.props?.click?.value !== menuId}
          mapItem={node => ({ text: node.data.props.text || "Link", props: node.data.props })}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          addLabel="Add Link"
          editTooltip="Edit link"
          renderLabel={(link: any) => link.text}
          onAdd={({ query, addNode }) => {
            const Button = query.getOptions().resolver.Button;
            if (Button) {
              addNode(
                <Button
                  text="New Link"
                  url="#"
                  className="hidden px-(--button-padding-x) py-(--button-padding-y) md:block"
                />
              );
            }
          }}
          renderPopover={(link: any) => (
            <NodeProvider id={link.id}>
              <ActionsInput />
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
