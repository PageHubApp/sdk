/**
 * MapPoint — Component definition via defineComponent()
 */
import React from "react";
import { TbMapPin } from "react-icons/tb";
import { defineComponent } from "../define";
import { MapPoint } from "./MapPoint";
import { MapPointMainTab } from "../chrome/Toolbar/UnifiedSettings/mainTabs/MapPointMainTab";
import { DeleteNodeController, SelectMapTool } from "./editor-chrome";

export const MapPointDef = defineComponent(
  {
    name: "MapPoint",
    displayName: "MapPoint",
    component: MapPoint,
    icon: TbMapPin,
    category: "Media",
    settings: MapPointMainTab,
    disable: [
      "textColor",
      "bgColor",
      "background",
      "pattern",
      "font",
      "shadow",
      "opacity",
      "border",
      "radius",
      "animations",
      "hoverClick",
    ],
    toolbarLayout: "hidden",
    rules: {
      canDrag: () => true,
      canMoveIn: () => false,
    },
    tools: props => [
      <SelectMapTool key="selectMap" />,
      <DeleteNodeController key="mapPointDelete" />,
    ],
  },
  { __internal: true }
);
