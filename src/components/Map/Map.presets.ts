/** Map — presets extracted from Map.craft.tsx. */
import { TbMap, TbMap2, TbMapPin } from "react-icons/tb";
import { Map } from "./Map";
import type { ComponentPreset } from "../../define/types";

export const mapPresets: ComponentPreset[] = [
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
];
