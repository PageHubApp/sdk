/** Pure body for Map types/helpers. NO `@craftjs/core`. */
import { BaseSelectorProps } from "../selectors";

export type MapDisplayType = "background" | "static" | "interactive";
export type TileStyle = "osm" | "cartodb-positron" | "cartodb-dark" | "cartodb-voyager";

export interface MapProps extends BaseSelectorProps {
  lat: number;
  lng: number;
  zoom: number;
  type: MapDisplayType;
  tileStyle: TileStyle;
  grayscale: boolean | string;
  title?: string;
}
