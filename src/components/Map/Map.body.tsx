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
  /**
   * Logical viewport the non-interactive tile grid is composed at (px). The grid
   * is centred in the container and clipped, so these are a coverage budget:
   * raise them for a container taller/wider than the 640x400 default, at the
   * cost of more tile requests. Ignored by `interactive` once Leaflet mounts.
   */
  staticWidth?: number;
  staticHeight?: number;
}
