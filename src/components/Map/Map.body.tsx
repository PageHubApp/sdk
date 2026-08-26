/** Pure body for Map types/helpers. NO `@craftjs/core`. */
import { BaseSelectorProps } from "../selectors";

export type MapDisplayType = "background" | "static" | "interactive";
export type TileStyle = "osm" | "cartodb-positron" | "cartodb-dark" | "cartodb-voyager";

export interface MapProps extends BaseSelectorProps {
  /**
   * A number from the inspector, or a `{{item.*}}` template on a collection
   * detail page so one Map node centres on whichever row the route resolved.
   * Read through `resolveMapCoord`, never directly.
   */
  lat: number | string;
  lng: number | string;
  zoom: number | string;
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

/**
 * Resolve one coordinate-ish prop to a finite number.
 *
 * `interpolate` is supplied by the caller so this stays free of both React and
 * the static render context — the React path passes `replaceVariables` bound to
 * `useItemContext()`, the static path binds it to `ctx.currentItem`.
 *
 * An unresolvable template (no item context, missing field) falls back rather
 * than producing `NaN`, which would put the tile grid at the antimeridian.
 */
export function resolveMapCoord(
  value: number | string | undefined,
  fallback: number,
  interpolate: (raw: string) => string
): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const resolved = raw.includes("{{") ? interpolate(raw).trim() : raw;
  const n = Number(resolved);
  return Number.isFinite(n) ? n : fallback;
}
