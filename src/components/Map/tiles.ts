/**
 * Slippy-map tile math shared by every Map render path (editor, viewer, static
 * export). NO React, NO `@craftjs/core` — importable from `toHTML` too.
 *
 * Why a tile GRID and not one tile: a single 256px tile stretched with
 * `object-cover` across an arbitrary box upscales the imagery to an arbitrary
 * factor and frames it on the tile's corner rather than the requested
 * coordinate, so the pin never lands on the address. Laying real tiles at their
 * natural 256px and centring the grid on the requested lat/lng keeps the
 * imagery at native resolution and makes marker placement exact.
 *
 * See https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
 */
import type { TileStyle } from "./Map.body";

export const TILE_SIZE = 256;

/**
 * NOT the same list as `MapLeaflet.tsx` — do not merge them. Leaflet expands its
 * own `{s}` (subdomain sharding) and `{r}` (retina) placeholders, which these
 * URLs must not contain because we substitute z/x/y by hand.
 */
export const TILE_URLS: Record<TileStyle, string> = {
  osm: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  "cartodb-positron": "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "cartodb-dark": "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
  "cartodb-voyager": "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
};

/**
 * Logical viewport the non-interactive grid is composed at. The grid is centred
 * in its container and clipped, so this is a *coverage* budget, not a layout
 * size: bigger covers taller/wider containers but costs more tile requests.
 * 640x400 needs 6 tiles typically, 12 worst case.
 */
export const DEFAULT_STATIC_WIDTH = 640;
export const DEFAULT_STATIC_HEIGHT = 400;

/** Default marker dot colour. Inline-styled so all three paths match without Tailwind. */
export const MARKER_COLOR = "#ef4444";

export function tileUrlFor(tileStyle: string, z: number, x: number, y: number): string {
  const template = TILE_URLS[tileStyle as TileStyle] || TILE_URLS.osm;
  return template
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}

/**
 * Web-Mercator world-pixel coordinate — FRACTIONAL on purpose. Flooring here
 * (the old `latLngToTile`) throws away the position within the tile, which is
 * exactly the precision a marker needs.
 */
export function latLngToWorldPixel(lat: number, lng: number, zoom: number) {
  const scale = Math.pow(2, zoom) * TILE_SIZE;
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const latRad = (clampedLat * Math.PI) / 180;
  return {
    x: ((lng + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale,
  };
}

export interface StaticMapPoint {
  id: string;
  lat: number;
  lng: number;
  title?: string;
}

export interface StaticMapTile {
  key: string;
  url: string;
  left: number;
  top: number;
}

export interface StaticMapPlan {
  width: number;
  height: number;
  tiles: StaticMapTile[];
  markers: Array<{ id: string; left: number; top: number; title: string }>;
}

/**
 * Compose the tile grid + marker offsets for a `static` / `background` map.
 * Coordinates returned are relative to the grid's own top-left; the grid is
 * meant to be centred in the container so `lat`/`lng` sits dead centre.
 */
export function buildStaticMapPlan(opts: {
  lat: number;
  lng: number;
  zoom: number;
  tileStyle: string;
  width?: number;
  height?: number;
  points?: StaticMapPoint[];
}): StaticMapPlan {
  const width = Math.max(1, Math.round(opts.width || DEFAULT_STATIC_WIDTH));
  const height = Math.max(1, Math.round(opts.height || DEFAULT_STATIC_HEIGHT));
  const { lat, lng, zoom, tileStyle } = opts;

  const center = latLngToWorldPixel(lat, lng, zoom);
  // Top-left world pixel of the logical viewport.
  const originX = center.x - width / 2;
  const originY = center.y - height / 2;

  const n = Math.pow(2, zoom);
  const firstTileX = Math.floor(originX / TILE_SIZE);
  const firstTileY = Math.floor(originY / TILE_SIZE);
  const lastTileX = Math.floor((originX + width - 1) / TILE_SIZE);
  const lastTileY = Math.floor((originY + height - 1) / TILE_SIZE);

  const tiles: StaticMapTile[] = [];
  for (let ty = firstTileY; ty <= lastTileY; ty++) {
    // Vertical wrap is meaningless — skip tiles above/below the projection.
    if (ty < 0 || ty >= n) continue;
    for (let tx = firstTileX; tx <= lastTileX; tx++) {
      // Horizontal wraps around the antimeridian.
      const wrappedX = ((tx % n) + n) % n;
      tiles.push({
        key: `${zoom}/${tx}/${ty}`,
        url: tileUrlFor(tileStyle, zoom, wrappedX, ty),
        left: tx * TILE_SIZE - originX,
        top: ty * TILE_SIZE - originY,
      });
    }
  }

  const markers = (opts.points || []).map(p => {
    const px = latLngToWorldPixel(p.lat, p.lng, zoom);
    return {
      id: p.id,
      left: px.x - originX,
      top: px.y - originY,
      title: p.title || "",
    };
  });

  return { width, height, tiles, markers };
}
