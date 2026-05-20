/**
 * Background — Component definition via defineComponent()
 */
import { TbContainer } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { lazyNamed } from "../../utils/lazyNamed";
import { Background } from "./Background";
import { toHTML } from "./Background.toHTML";

export { toHTML };

const BackgroundMainTab = lazyNamed(
  () => import("../../chrome/toolbar/inspector/mainTabs/BackgroundMainTab"),
  "BackgroundMainTab",
);
import {
  HoverNodeController,
  NameNodeController,
  ToolNodeController,
  ContainerSettingsNodeTool,
} from "../../chrome/editor-chrome";

export const BackgroundDef = defineComponent(
  {
    name: "Background",
    description: "The page itself — sets the site's colours and fonts.",
    component: Background,
    icon: TbContainer,
    category: "__internal",
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
