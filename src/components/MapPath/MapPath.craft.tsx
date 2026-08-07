/**
 * MapPath — Component definition via defineComponent()
 */
import { TbRoute } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { MapPath } from "./MapPath";
import { toHTML } from "./MapPath.toHTML";
import { lazyNamed } from "../../utils/lazyNamed";

export { toHTML };

const MapPathMainTab = lazyNamed(
  () => import("../../chrome/toolbar/inspector/mainTabs/MapPathMainTab"),
  "MapPathMainTab",
);
import { DeleteNodeController, SelectMapTool } from "../../chrome/editor-chrome";

export const MapPathDef = defineComponent(
  {
    name: "MapPath",
    displayName: "MapPath",
    description: "A route line you draw across a map.",
    component: MapPath,
    icon: TbRoute,
    category: "Media",
    settings: MapPathMainTab,
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
      <DeleteNodeController key="mapPathDelete" />,
    ],
  },
  { __internal: true }
);
