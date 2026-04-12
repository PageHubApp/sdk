/**
 * ContainerGroup — Component definition via defineComponent()
 */
import React from "react";
import { TbContainer } from "react-icons/tb";
import { defineComponent } from "../define";
import { ContainerGroup } from "./ContainerGroup";
import { staticClasses, getInlineStyle, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  return tag(
    "div",
    {
      class: staticClasses(props, ctx) || undefined,
      style: getInlineStyle(props) || undefined,
      id: props.id || undefined,
      ...ariaAttrs(props),
    },
    children
  );
};
import { ContainerGroupMainTab } from "../chrome/Toolbar/UnifiedSettings/mainTabs/ContainerGroupMainTab";

export const ContainerGroupDef = defineComponent(
  {
    name: "ContainerGroup",
    component: ContainerGroup,
    icon: TbContainer,
    category: "Layout",
    canvas: true,
    settings: ContainerGroupMainTab,
    toHTML,
    defaultProps: {
      className: "w-full flex flex-col gap-space-md py-space-md px-container-x min-h-48",
    },
    disable: ["shadow", "opacity", "pattern"],
    rules: {
      canDrag: () => true,
      canMoveIn: () => true,
      canMoveOut: () => true,
    },
    craftProps: {
      items: [],
      groupSettings: {},
    },
  },
  { __internal: true }
);
