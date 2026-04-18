/**
 * Dropdown — Component definition via defineComponent()
 *
 * CSS-first dropdown using group + focus-within/hover for toggle.
 * Zero JS needed for basic open/close behavior.
 */
import React from "react";
import { Element } from "@craftjs/core";
import { TbChevronDown } from "react-icons/tb";
import { defineComponent } from "../define";
import { Dropdown } from "./Dropdown";
import { Container } from "./Container";
import { Button } from "./Button";
import { staticClasses, getInlineStyle, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";
import {
  DropdownMainTab,
  DropdownMainTabAdvanced,
} from "../chrome/toolbar/unified-settings/mainTabs/DropdownMainTab";
import { HoverNodeController, NameNodeController, DeleteNodeController } from "./editor-chrome";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  const trigger = props.trigger || "click";
  const wrapperClass = [staticClasses(props, ctx), "group relative inline-flex flex-col"]
    .filter(Boolean)
    .join(" ");

  return tag(
    "div",
    {
      class: wrapperClass,
      style: getInlineStyle(props) || undefined,
      tabindex: trigger === "click" ? "0" : undefined,
      ...ariaAttrs(props),
    },
    children
  );
};

const chevronSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-1"><path d="m6 9 6 6 6-6"/></svg>`;

function buildDropdownChildren() {
  return [
    // Trigger Button
    <Element
      key="trigger"
      is={Button}
      custom={{ displayName: "Dropdown Trigger" }}
      text="Menu"
      url=""
      icon={{ value: chevronSvg, position: "right", only: false }}
      canDelete={true}
      canEditName={true}
      className="btn btn-primary rounded-box px-space-md py-space-xs min-h-12 font-semibold"
    />,
    // Dropdown Panel
    <Element
      key="panel"
      canvas
      is={Container}
      custom={{ displayName: "Dropdown Panel" }}
      canDelete={true}
      canEditName={true}
      className="bg-base-200 text-base-content rounded-box border-base-300 absolute top-full left-0 z-50 mt-1 hidden min-w-48 flex-col overflow-hidden border py-space-xs shadow-lg group-focus-within:flex"
    >
      <Element
        is={Button}
        custom={{ displayName: "Option 1" }}
        text="Option 1"
        url="#"
        className="hover:bg-neutral w-full rounded-none border-0 px-space-sm py-space-xs text-left text-sm"
      />
      <Element
        is={Button}
        custom={{ displayName: "Option 2" }}
        text="Option 2"
        url="#"
        className="hover:bg-neutral w-full rounded-none border-0 px-space-sm py-space-xs text-left text-sm"
      />
      <Element
        is={Button}
        custom={{ displayName: "Option 3" }}
        text="Option 3"
        url="#"
        className="hover:bg-neutral w-full rounded-none border-0 px-space-sm py-space-xs text-left text-sm"
      />
    </Element>,
  ];
}

export const DropdownDef = defineComponent(
  {
    name: "Dropdown",
    component: Dropdown,
    icon: TbChevronDown,
    category: "Interactive",
    canvas: true,
    settings: DropdownMainTab,
    advancedSettings: DropdownMainTabAdvanced,
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
        key="dropdownName"
        position="top"
        align="start"
        placement="end"
        alt={{ position: "bottom", align: "start", placement: "start" }}
      />,
    ],
    presets: [
      {
        label: "Dropdown",
        description: "CSS-powered dropdown menu with customizable options.",
        props: {
          trigger: "click",
          position: "bottom-start",
          closeOnClickOutside: true,
          className: "group relative inline-flex flex-col",
          custom: {},
        },
        children: buildDropdownChildren,
      },
    ],
  },
  { __internal: true }
);
