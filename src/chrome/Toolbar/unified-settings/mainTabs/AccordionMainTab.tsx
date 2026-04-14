import React from "react";
import { Element, useEditor, useNode } from "@craftjs/core";
import { TbPlus, TbTrash } from "react-icons/tb";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, renderAdvancedComponentSlots, SECTION_ICONS } from "../helpers";

const CHEVRON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;

export const AccordionMainTab = () => {
  const { id, props } = useNode(node => ({ props: node.data.props }));
  const { actions, query } = useEditor();

  const node = query.node(id).get();
  const childIds = node?.data?.nodes || [];
  const itemCount = childIds.length;

  const addItem = async () => {
    const idx = itemCount;
    const title = `Accordion Item ${idx + 1}`;

    const { Container } = await import("../../../../components/Container");
    const { Text } = await import("../../../../components/Text");

    const itemElement = (
      <Element
        canvas
        is={Container}
        type="details"
        custom={{ displayName: title, rules: { canMoveOut: () => false } }}
        className="border-base-300 group border-b"
      >
        <Element
          is={Container}
          type="summary"
          custom={{ displayName: `${title} Header` }}
          canDelete={true}
          canEditName={true}
          className="flex cursor-pointer list-none flex-row items-center justify-between px-4 py-3 select-none"
        >
          <Element
            is={Text}
            custom={{ displayName: "Title" }}
            text={`<p class="font-medium">${title}</p>`}
          />
          <Element
            is={Text}
            custom={{ displayName: "Chevron" }}
            text={`<span class="transition-transform duration-200 group-open:rotate-180">${CHEVRON_SVG}</span>`}
          />
        </Element>
        <Element
          canvas
          is={Container}
          custom={{ displayName: `${title} Content` }}
          canDelete={true}
          canEditName={true}
          className="gap-container flex flex-col px-4 py-3"
        >
          <Element
            is={Text}
            custom={{ displayName: "Content" }}
            text="<p>Content for this accordion item. Replace with your own content.</p>"
          />
        </Element>
      </Element>
    );

    try {
      const tree = query.parseReactElement(itemElement).toNodeTree();
      actions.addNodeTree(tree, id);
    } catch (e) {
      console.error("Failed to add accordion item:", e);
    }
  };

  const removeLastItem = () => {
    if (itemCount <= 1) return;
    const lastChildId = childIds[itemCount - 1];
    actions.delete(lastChildId);
  };

  // Build dynamic default-open options based on actual item count
  const defaultOpenOptions = [
    <option key={-1} value={-1}>
      None
    </option>,
    ...Array.from({ length: itemCount }, (_, i) => (
      <option key={i} value={i}>
        Item {i + 1}
      </option>
    )),
  ];

  return renderComponentSlots({
    Content: (
      <ToolbarSection
        title="Content"
        icon={SECTION_ICONS["Content"]}
        help="Accordion behavior settings."
      >
        <ToolbarItem
          propKey="multiOpen"
          propType="component"
          type="toggle"
          label="Allow Multiple Open"
          option="Allow multiple items open simultaneously"
          on={true}
        />

        <ToolbarItem propKey="defaultOpen" propType="component" type="select" label="Default Open">
          {defaultOpenOptions}
        </ToolbarItem>

        <ToolbarItem propKey="animation" propType="component" type="select" label="Animation">
          <option value="slideFade">Slide + Fade</option>
          <option value="slide">Slide</option>
          <option value="fade">Fade</option>
          <option value="none">None</option>
        </ToolbarItem>

        {props.animation && props.animation !== "none" && (
          <>
            <ToolbarItem
              propKey="animationDuration"
              propType="component"
              type="slider"
              label="Duration"
              min={0.1}
              max={1}
              step={0.05}
              defaultValue={0.3}
              suffix="s"
            />
            <ToolbarItem propKey="animationEasing" propType="component" type="select" label="Easing">
              <option value="ease">Ease</option>
              <option value="ease-out">Ease Out</option>
              <option value="ease-in">Ease In</option>
              <option value="ease-in-out">Ease In-Out</option>
              <option value="linear">Linear</option>
            </ToolbarItem>
          </>
        )}

        <div className="flex gap-2">
          <button
            className="border-base-300 hover:bg-neutral flex flex-1 items-center justify-center gap-1.5 rounded border px-3 py-2 text-xs font-medium transition-colors"
            onClick={addItem}
          >
            <TbPlus className="h-3.5 w-3.5" />
            Add Item
          </button>
          <button
            className="border-base-300 hover:bg-neutral flex items-center justify-center gap-1.5 rounded border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            onClick={removeLastItem}
            disabled={itemCount <= 1}
          >
            <TbTrash className="h-3.5 w-3.5" />
          </button>
        </div>
        <SettingsAiSlot />
      </ToolbarSection>
    ),
  });
};

export const AccordionMainTabAdvanced = () => {
  return renderAdvancedComponentSlots({});
};
