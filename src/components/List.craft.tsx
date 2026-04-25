/**
 * List — Semantic ul/ol with ListItem children (feature bullets, pricing rows).
 */
import React from "react";
import { TbList } from "react-icons/tb";
import { defineComponent } from "../define";
import { List } from "./List";
import { staticClasses, getInlineStyle, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";
import { ListMainTab } from "../chrome/toolbar/unified-settings/mainTabs/ListMainTab";
import { HoverNodeController, DeleteNodeController } from "./editor-chrome";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  const Tag = props.ordered ? "ol" : "ul";
  return tag(
    Tag,
    {
      class: staticClasses(props, ctx) || undefined,
      style: getInlineStyle(props) || undefined,
      ...ariaAttrs(props),
    },
    children
  );
};

export const ListDef = defineComponent(
  {
    name: "List",
    displayName: "List",
    component: List,
    icon: TbList,
    category: "List",
    canvas: true,
    settings: ListMainTab,
    toHTML,
    disable: ["textColor", "bgColor", "shadow", "opacity", "hoverClick"],
    rules: {
      canDrag: () => true,
      canMoveIn: nodes => nodes.every(node => node.data?.name === "ListItem"),
    },
    tools: props => [
      <HoverNodeController
        key="listHoverController"
        position="top"
        align="end"
        placement="end"
        alt={{
          position: "bottom",
          align: "start",
          placement: "start",
        }}
      />,
      <DeleteNodeController key="listDelete" />,
    ],
    presets: [
      {
        label: "Checklist",
        description: "Unordered list with check markers — common for features.",
        props: {
          ordered: false,
          markerStyle: "check",
          className: "list-none m-0 flex w-full flex-col gap-space-xs p-0 text-base-content",
        },
      },
      {
        label: "Bullet list",
        description: "Simple bullet markers.",
        props: {
          ordered: false,
          markerStyle: "bullet",
          className: "list-none m-0 flex w-full flex-col gap-space-sm p-0 text-base-content",
        },
      },
      {
        label: "Numbered list",
        description: "Ordered list with native numbering.",
        props: {
          ordered: true,
          className:
            "m-0 w-full list-decimal space-y-space-xs pl-6 text-base-content marker:text-base-content",
        },
      },
      {
        label: "Icon bullets",
        description: "Material Symbols marker — pick the glyph in settings.",
        props: {
          ordered: false,
          markerStyle: "icon",
          markerIcon: { value: "ref-icon:tb/TbCircleCheck", size: "w-6 h-6" },
          className: "list-none m-0 flex w-full flex-col gap-space-sm p-0 text-base-content",
        },
      },
    ],
  },
  { __internal: true }
);
