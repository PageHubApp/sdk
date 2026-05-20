/**
 * Map — Component definition via defineComponent()
 */
import { TbMap, TbMap2, TbMapPin } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { Map } from "./Map";
import { toHTML } from "./Map.toHTML";
import { lazyNamed } from "../../utils/lazyNamed";

const MapMainTab = lazyNamed(
  () => import("../../chrome/toolbar/inspector/mainTabs/MapMainTab"),
  "MapMainTab",
);
import {
  HoverNodeController,
  NameNodeController,
  DeleteNodeController,
} from "../../chrome/editor-chrome";

export { toHTML };

export const MapDef = defineComponent(
  {
    name: "Map",
    description: "A map you can drag, zoom, and pin places on.",
    component: Map,
    icon: TbMap,
    category: "Media",
    canvas: true,
    settings: MapMainTab,
    toHTML,
    disable: ["textColor", "bgColor", "pattern", "font", "hoverClick"],
    rules: {
      canDrag: () => true,
      canMoveIn: nodes => nodes.every(node => node.data?.name === "MapPoint"),
    },
    tools: props => [
      <NameNodeController key="mapNameController" position="top" align="end" placement="start" />,
    ],
  },
  { __internal: true }
);
