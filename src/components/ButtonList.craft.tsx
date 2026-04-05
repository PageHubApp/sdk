/**
 * ButtonList — Component definition via defineComponent()
 */
import React from "react";
import { defineComponent } from "../define";
import { ButtonList } from "./ButtonList";
import { staticClasses, getInlineStyle, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  return tag("div", {
    class: staticClasses(props, ctx) || undefined,
    style: getInlineStyle(props) || undefined,
    ...ariaAttrs(props),
  }, children);
};
import { ButtonListMainTab } from "../chrome/Toolbar/UnifiedSettings/mainTabs/ButtonListMainTab";
import { HoverNodeController, DeleteNodeController } from "./editor-chrome";

export const ButtonListDef = defineComponent({
  name: "ButtonList",
  component: ButtonList,
  icon: "RxButton",
  category: "Basic",
  canvas: true,
  settings: ButtonListMainTab,
  toHTML,
  disable: [
    "textColor", "bgColor", "shadow", "opacity", "hoverClick",
  ],
  rules: {
    canDrag: () => true,
    canMoveIn: (nodes) => nodes.every(node => node.data?.name === "Button"),
  },
  tools: (props) => [
    <HoverNodeController
      key="buttonListHoverController"
      position="top"
      align="end"
      placement="end"
      alt={{
        position: "bottom",
        align: "start",
        placement: "start",
      }}
    />,
    <DeleteNodeController key="buttonListDelete" />,
  ],
  presets: [
    {
      label: "Button List",
      props: {
        className: "flex-col items-center justify-start gap-2 px-4 py-2 w-auto flex md:flex-row md:items-center md:justify-start md:gap-2 border border-border rounded-lg",
        buttons: [
          { text: "Button 1" },
          { text: "Button 2" },
        ],
      },
    },
  ],
}, { __internal: true });
