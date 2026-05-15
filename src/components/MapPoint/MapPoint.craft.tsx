/**
 * MapPoint — Component definition via defineComponent()
 */
import React from "react";
import { TbMapPin } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { MapPoint } from "./MapPoint";
import type { ToHTMLFn } from "../../utils/staticHtml";

// MapPoint data is encoded into the parent Map's `data-ph-map` JSON,
// so the point itself emits nothing in static HTML.
const toHTML: ToHTMLFn = () => "";
const MapPointMainTab = React.lazy(() =>
  import("../../chrome/toolbar/inspector/mainTabs/MapPointMainTab").then(mod => ({
    default: mod.MapPointMainTab,
  }))
);
import { DeleteNodeController, SelectMapTool } from "../../chrome/editor-chrome";

export const MapPointDef = defineComponent(
  {
    name: "MapPoint",
    displayName: "MapPoint",
    description: "A pin you drop on a map.",
    component: MapPoint,
    icon: TbMapPin,
    category: "Media",
    settings: MapPointMainTab,
    toHTML,
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
