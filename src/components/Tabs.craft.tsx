/**
 * Tabs — Component definition via defineComponent()
 *
 * Reuses existing show-hide tab action system from clickControls.ts.
 * Preset builds a tab bar (Buttons) + tab panels (Containers with tabGroup).
 */
import React from "react";
import { Element } from "@craftjs/core";
import { TbLayoutBottombar } from "react-icons/tb";
import { defineComponent } from "../define";
import { Tabs } from "./Tabs";
import { Container } from "./Container";
import { Button } from "./Button";
import { Text } from "./Text";
import { staticClasses, getInlineStyle, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";
import {
  TabsMainTab,
  TabsMainTabAdvanced,
} from "../chrome/Toolbar/UnifiedSettings/mainTabs/TabsMainTab";
import { HoverNodeController, NameNodeController, DeleteNodeController } from "./editor-chrome";

const TAB_COUNT = 3;
const GROUP_ID = "tabs-group";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  return tag(
    "div",
    {
      class: staticClasses(props, ctx) || undefined,
      style: getInlineStyle(props) || undefined,
      role: "tablist",
      ...ariaAttrs(props),
    },
    children
  );
};

function buildTabButton(index: number) {
  const isFirst = index === 0;
  return (
    <Element
      key={`btn-${index}`}
      is={Button}
      custom={{ displayName: `Tab ${index + 1}` }}
      text={`Tab ${index + 1}`}
      url=""
      action={{
        type: "show-hide",
        target: `tab-panel-${index}`,
        direction: "tab",
        trigger: "click",
        method: "class",
        group: GROUP_ID,
      }}
      className={`rounded-none border-b-2 px-4 py-2 text-sm font-medium ${
        isFirst
          ? "border-primary text-primary"
          : "text-neutral-content hover:text-base-content hover:border-base-300 border-transparent"
      }`}
    />
  );
}

function buildTabPanel(index: number) {
  const isFirst = index === 0;
  return (
    <Element
      key={`panel-${index}`}
      canvas
      is={Container}
      custom={{ displayName: `Tab Panel ${index + 1}` }}
      id={`tab-panel-${index}`}
      tabGroup={GROUP_ID}
      canDelete={true}
      canEditName={true}
      className={`gap-container px-container-x flex flex-col py-container-y${isFirst ? "" : "hidden"}`}
    >
      <Element
        is={Text}
        custom={{ displayName: "Content" }}
        text={`<p>Content for Tab ${index + 1}. Replace with your own content.</p>`}
      />
    </Element>
  );
}

function buildTabsChildren() {
  const buttons: React.ReactNode[] = [];
  const panels: React.ReactNode[] = [];

  for (let i = 0; i < TAB_COUNT; i++) {
    buttons.push(buildTabButton(i));
    panels.push(buildTabPanel(i));
  }

  return [
    // Tab Bar
    <Element
      key="tabbar"
      canvas
      is={Container}
      custom={{ displayName: "Tab Bar" }}
      canDelete={true}
      canEditName={true}
      className="border-base-300 flex flex-row gap-0 border-b"
    >
      {buttons}
    </Element>,
    // Tab Panels
    ...panels,
  ];
}

export const TabsDef = defineComponent(
  {
    name: "Tabs",
    component: Tabs,
    icon: TbLayoutBottombar,
    category: "Interactive",
    canvas: true,
    settings: TabsMainTab,
    advancedSettings: TabsMainTabAdvanced,
    toHTML,
    disable: ["hoverClick"],
    rules: {
      canDrag: () => true,
      canDelete: () => true,
      canMoveIn: () => true,
      canMoveOut: () => false,
    },
    tools: () => [
      <NameNodeController
        key="tabsName"
        position="top"
        align="start"
        placement="end"
        alt={{ position: "bottom", align: "start", placement: "start" }}
      />,
      <HoverNodeController
        key="tabsHover"
        position="top"
        align="start"
        placement="end"
        alt={{ position: "bottom", align: "start", placement: "start" }}
      />,
      <DeleteNodeController key="tabsDelete" />,
    ],
    presets: [
      {
        label: "Tabs",
        props: {
          defaultTab: 0,
          orientation: "horizontal",
          mobileMode: "scroll",
          className: "flex flex-col w-full",
          custom: {},
        },
        children: buildTabsChildren,
      },
    ],
  },
  { __internal: true }
);
