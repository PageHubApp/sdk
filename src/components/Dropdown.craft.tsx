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
import { DropdownMainTab, DropdownMainTabAdvanced } from "../chrome/Toolbar/UnifiedSettings/mainTabs/DropdownMainTab";
import { HoverNodeController, NameNodeController, DeleteNodeController } from "./editor-chrome";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  const trigger = props.trigger || "click";
  const wrapperClass = [
    staticClasses(props, ctx),
    "group relative inline-flex flex-col",
  ].filter(Boolean).join(" ");

  return tag("div", {
    class: wrapperClass,
    style: getInlineStyle(props) || undefined,
    tabindex: trigger === "click" ? "0" : undefined,
    ...ariaAttrs(props),
  }, children);
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
      className="px-(--button-padding-x) py-(--button-padding-y) bg-(--primary) text-(--primary-foreground) rounded-(--radius) flex items-center gap-1"
    />,
    // Dropdown Panel
    <Element
      key="panel"
      canvas
      is={Container}
      custom={{ displayName: "Dropdown Panel" }}
      canDelete={true}
      canEditName={true}
      className="absolute top-full left-0 z-50 hidden group-focus-within:flex flex-col min-w-48 mt-1 bg-(--card) text-(--card-foreground) shadow-lg rounded-(--radius) border border-(--border) py-1 overflow-hidden"
    >
      <Element
        is={Button}
        custom={{ displayName: "Option 1" }}
        text="Option 1"
        url="#"
        className="w-full px-4 py-2 text-left text-sm hover:bg-(--muted) rounded-none border-0"
      />
      <Element
        is={Button}
        custom={{ displayName: "Option 2" }}
        text="Option 2"
        url="#"
        className="w-full px-4 py-2 text-left text-sm hover:bg-(--muted) rounded-none border-0"
      />
      <Element
        is={Button}
        custom={{ displayName: "Option 3" }}
        text="Option 3"
        url="#"
        className="w-full px-4 py-2 text-left text-sm hover:bg-(--muted) rounded-none border-0"
      />
    </Element>,
  ];
}

export const DropdownDef = defineComponent({
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
    <HoverNodeController
      key="dropdownHover"
      position="top"
      align="start"
      placement="end"
      alt={{ position: "bottom", align: "start", placement: "start" }}
    />,
    <DeleteNodeController key="dropdownDelete" />,
  ],
  presets: [
    {
      label: "Dropdown",
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
}, { __internal: true });
