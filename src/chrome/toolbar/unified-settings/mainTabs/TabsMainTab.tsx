import React from "react";
import { Element, useEditor, useNode } from "@craftjs/core";
import { TbPlus, TbTrash } from "react-icons/tb";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, renderAdvancedComponentSlots, SECTION_ICONS } from "../helpers";

export const TabsMainTab = () => {
  const { id, props } = useNode(node => ({ props: node.data?.props }));
  const { actions, query } = useEditor();

  const node = query.node(id).get();
  const childIds = node?.data?.nodes || [];

  // First child is the tab bar, rest are panels
  const tabBarId = childIds[0];
  const tabBar = tabBarId ? query.node(tabBarId).get() : null;
  const tabButtonIds = tabBar?.data?.nodes || [];
  const tabCount = tabButtonIds.length;
  const panelIds = childIds.slice(1);

  const addTab = async () => {
    const idx = tabCount;
    const label = `Tab ${idx + 1}`;
    const groupId = `tabs-${id}`;
    const panelId = `tab-${id}-panel-${idx}`;

    const { Button } = await import("../../../../components/Button");
    const { Container } = await import("../../../../components/Container");
    const { Text } = await import("../../../../components/Text");

    // Add button to tab bar
    const btnElement = (
      <Element
        is={Button}
        custom={{ displayName: label }}
        text={label}
        url=""
        action={{
          type: "show-hide",
          target: panelId,
          direction: "tab",
          trigger: "click",
          method: "class",
          group: groupId,
        }}
        className="text-neutral-content hover:text-base-content hover:border-base-300 rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium"
      />
    );

    // Add panel
    const panelElement = (
      <Element
        canvas
        is={Container}
        custom={{ displayName: `Tab Panel ${idx + 1}` }}
        id={panelId}
        tabGroup={groupId}
        canDelete={true}
        canEditName={true}
        className="gap-container px-container-x py-container-y hidden flex-col"
      >
        <Element
          is={Text}
          custom={{ displayName: "Content" }}
          text={`<p>Content for ${label}. Replace with your own content.</p>`}
        />
      </Element>
    );

    try {
      const btnTree = query.parseReactElement(btnElement).toNodeTree();
      actions.addNodeTree(btnTree, tabBarId);

      const panelTree = query.parseReactElement(panelElement).toNodeTree();
      actions.addNodeTree(panelTree, id);
    } catch (e) {
      console.error("Failed to add tab:", e);
    }
  };

  const removeLastTab = () => {
    if (tabCount <= 1) return;
    // Remove last button from tab bar
    const lastBtnId = tabButtonIds[tabCount - 1];
    actions.delete(lastBtnId);
    // Remove last panel
    const lastPanelId = panelIds[panelIds.length - 1];
    if (lastPanelId) actions.delete(lastPanelId);
  };

  // Dynamic default tab options
  const defaultTabOptions = Array.from({ length: tabCount }, (_, i) => (
    <option key={i} value={i}>
      Tab {i + 1}
    </option>
  ));

  return renderComponentSlots({
    Content: (
      <ToolbarSection collapsible={false}>
        <ToolbarItem propKey="defaultTab" propType="component" type="select" label="Default Tab">
          {defaultTabOptions}
        </ToolbarItem>

        <ToolbarItem propKey="orientation" propType="component" type="select" label="Orientation">
          <option value="horizontal">Horizontal</option>
          <option value="vertical">Vertical</option>
        </ToolbarItem>

        <ToolbarItem
          propKey="mobileMode"
          propType="component"
          type="select"
          label="Mobile Behavior"
        >
          <option value="scroll">Scroll</option>
          <option value="stack">Stack</option>
        </ToolbarItem>

        <div className="flex gap-2">
          <button
            className="border-base-300 hover:bg-neutral flex flex-1 items-center justify-center gap-1.5 rounded border px-3 py-2 text-xs font-medium transition-colors"
            onClick={addTab}
          >
            <TbPlus className="h-3.5 w-3.5" />
            Add Tab
          </button>
          <button
            className="border-base-300 hover:bg-neutral flex items-center justify-center gap-1.5 rounded border px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            onClick={removeLastTab}
            disabled={tabCount <= 1}
          >
            <TbTrash className="h-3.5 w-3.5" />
          </button>
        </div>
        <SettingsAiSlot />
      </ToolbarSection>
    ),
  });
};

export const TabsMainTabAdvanced = () => {
  return renderAdvancedComponentSlots({});
};
