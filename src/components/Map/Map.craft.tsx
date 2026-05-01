/**
 * Map — Component definition via defineComponent()
 */
import React from "react";
import { TbMap, TbMap2, TbMapPin } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { Map } from "./Map";
const MapMainTab = React.lazy(() =>
  import("../../chrome/toolbar/inspector/mainTabs/MapMainTab").then(mod => ({
    default: mod.MapMainTab,
  }))
);
import {
  HoverNodeController,
  NameNodeController,
  DeleteNodeController,
} from "../../chrome/editor-chrome";

export const MapDef = defineComponent(
  {
    name: "Map",
    description: "A map you can drag, zoom, and pin places on.",
    component: Map,
    icon: TbMap,
    category: "Media",
    canvas: true,
    settings: MapMainTab,
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
