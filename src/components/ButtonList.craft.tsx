/**
 * ButtonList — Component definition via defineComponent()
 */
import React from "react";
import { TbStack2 } from "react-icons/tb";
import { defineComponent } from "../define";
import { ButtonList } from "./ButtonList";
import { staticClasses, getInlineStyle, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  return tag(
    "div",
    {
      class: staticClasses(props, ctx) || undefined,
      style: getInlineStyle(props) || undefined,
      ...ariaAttrs(props),
    },
    children
  );
};
import { ButtonListMainTab } from "../chrome/toolbar/unified-settings/mainTabs/ButtonListMainTab";

export const ButtonListDef = defineComponent(
  {
    name: "ButtonList",
    component: ButtonList,
    icon: TbStack2,
    category: "Content",
    canvas: true,
    settings: ButtonListMainTab,
    toHTML,
    disable: ["textColor", "bgColor", "shadow", "opacity", "hoverClick"],
    rules: {
      canDrag: () => true,
      canMoveIn: nodes => nodes.every(node => node.data?.name === "Button"),
    },
    tools: [],
    presets: [
      {
        label: "Button List",
        description: "Group of buttons in a row or column.",
        props: {
          className:
            "flex flex-col items-center justify-start gap-space-xs md:flex-row md:items-center md:justify-start w-auto",
          buttons: [{ text: "Button 1" }, { text: "Button 2" }],
        },
      },
    ],
  },
  { __internal: true }
);
