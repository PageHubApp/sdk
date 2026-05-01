/**
 * Map — Component definition via defineComponent()
 */
import React from "react";
import { TbMap, TbMap2, TbMapPin } from "react-icons/tb";
import { defineComponent } from "../../define";
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
    presets: [
      {
        label: "Map",
        icon: TbMap,
        props: {
          type: "interactive",
          tileStyle: "osm",
          className: "w-full aspect-video overflow-hidden",
        },
      },
      {
        label: "Static Map",
        icon: TbMapPin,
        props: {
          type: "static",
          tileStyle: "osm",
          className: "w-full aspect-video overflow-hidden",
        },
      },
      {
        label: "Map BG",
        icon: TbMap2,
        props: {
          type: "background",
          tileStyle: "cartodb-positron",
          grayscale: true,
          className: "w-full aspect-video overflow-hidden",
        },
      },
    ],
  },
  { __internal: true }
);
