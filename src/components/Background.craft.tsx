/**
 * Background — Component definition via defineComponent()
 */
import React from "react";
import { TbContainer } from "react-icons/tb";
import { defineComponent } from "../define";
import { Background } from "./Background";
import { staticClasses, getInlineStyle, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";
import { resolveTheme } from "../utils/design/resolveTheme";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  const bgCtx = { ...ctx, palette: resolveTheme(props).palette };
  return tag(
    "main",
    {
      class: staticClasses(props, bgCtx) || undefined,
      style: getInlineStyle(props) || undefined,
      ...ariaAttrs(props),
    },
    children
  );
};
import { BackgroundMainTab } from "../chrome/Toolbar/UnifiedSettings/mainTabs/BackgroundMainTab";
import {
  HoverNodeController,
  NameNodeController,
  ToolNodeController,
  ContainerSettingsNodeTool,
} from "./editor-chrome";

export const BackgroundDef = defineComponent(
  {
    name: "Background",
    component: Background,
    icon: TbContainer,
    category: "Layout",
    canvas: true,
    settings: BackgroundMainTab,
    toHTML,
    disable: ["shadow", "border", "opacity", "radius", "hoverClick", "animations"],
    defaultProps: {
      className:
        "bg-base-100 text-base-content font-normal text-base min-h-dvh w-full min-w-0 flex flex-col overflow-x-hidden overflow-y-auto font-body",
    },
    rules: {
      canDrag: () => false,
      canMoveIn: nodes => nodes.every(node => node.data?.name === "Container"),
    },
    tools: () => [
      <NameNodeController key="name" position="bottom" align="end" placement="start" />,
      <HoverNodeController
        key="hover"
        position="top"
        align="start"
        placement="end"
        alt={{
          position: "bottom",
          align: "start",
          placement: "start",
        }}
      />,
      <ToolNodeController key="tool" position="bottom" align="start" placement="start">
        <ContainerSettingsNodeTool />
      </ToolNodeController>,
    ],
  },
  { __internal: true }
);
