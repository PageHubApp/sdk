/**
 * MapPoint — Component definition via defineComponent()
 */
import { TbMapPin } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { MapPoint } from "./MapPoint";
import { toHTML } from "./MapPoint.toHTML";
import { lazyNamed } from "../../utils/lazyNamed";

export { toHTML };

const MapPointMainTab = lazyNamed(
  () => import("../../chrome/toolbar/inspector/mainTabs/MapPointMainTab"),
  "MapPointMainTab",
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
