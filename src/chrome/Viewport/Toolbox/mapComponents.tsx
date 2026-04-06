import { TbMap, TbMapPin, TbMap2 } from "react-icons/tb";
import { Map } from "../../../components/Map";
import { RenderToolComponent, ToolboxItemDisplay } from "./lib";

export const RenderMapComponent = ({ display, ...props }) => (
  <RenderToolComponent element={Map} display={display} {...props} />
);

export const MapToolbox = {
  title: "Maps",
  content: [
    <RenderMapComponent
      key="map-interactive"
      className="w-full aspect-video overflow-hidden"
      type="interactive"
      tileStyle="osm"
      display={<ToolboxItemDisplay icon={TbMap} label="Map" />}
      custom={{ displayName: "Map" }}
    />,
    <RenderMapComponent
      key="map-static"
      className="w-full aspect-video overflow-hidden"
      type="static"
      tileStyle="osm"
      display={<ToolboxItemDisplay icon={TbMapPin} label="Static Map" />}
      custom={{ displayName: "Static Map" }}
    />,
    <RenderMapComponent
      key="map-background"
      className="w-full aspect-video overflow-hidden"
      type="background"
      tileStyle="cartodb-positron"
      grayscale={true}
      display={<ToolboxItemDisplay icon={TbMap2} label="Map BG" />}
      custom={{ displayName: "Map Background" }}
    />,
  ],
};
