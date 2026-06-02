import React from "react";
import { motionIt } from "../../utils/motion";
import { applyAnimation } from "../../utils/tailwind/tailwind";
import { applyAriaProps } from "../selectors";
import { useMounted } from "../../utils/hooks/useMounted";
import { useWalkerNode } from "../../render/react/contexts";
import type { MapProps, TileStyle } from "./Map.body";

const LazyLeafletMap =
  typeof window !== "undefined" ? React.lazy(() => import("./MapLeaflet")) : null;

const TILE_URLS: Record<TileStyle, string> = {
  osm: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  "cartodb-positron": "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "cartodb-dark": "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
  "cartodb-voyager": "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
};

function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

function getStaticTileUrl(lat: number, lng: number, zoom: number, tileStyle: TileStyle) {
  const { x, y } = latLngToTile(lat, lng, zoom);
  return TILE_URLS[tileStyle]
    .replace("{z}", String(zoom))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}

interface ChildPoint {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
}

export const MapRender = (incomingProps: MapProps & { childPoints?: ChildPoint[] }) => {
  const props: any = {
    lat: 51.505, lng: -0.09, zoom: 13,
    type: "interactive", tileStyle: "osm", grayscale: false, title: "",
    ...incomingProps,
  };
  const id = useWalkerNode()?.id ?? "";
  const isMounted = useMounted();
  const childPoints: ChildPoint[] = props.childPoints ?? [];
  const { lat, lng, zoom, type, tileStyle, grayscale } = props;
  const hasLocation = lat !== 0 || lng !== 0;
  const filterStyle = grayscale ? { filter: "grayscale(1)" } : {};

  const renderMapContent = () => {
    if (!hasLocation) return null;
    if (type === "background" || type === "static") {
      const tileUrl = getStaticTileUrl(lat, lng, zoom, tileStyle);
      return (
        <div className="relative size-full" style={filterStyle}>
          <img src={tileUrl} alt={props.title || `Map at ${lat}, ${lng}`} className="size-full object-cover" loading="lazy" />
          {type === "static" && childPoints.length > 0 &&
            childPoints.map(point => {
              const { x: cx, y: cy } = latLngToTile(lat, lng, zoom);
              const { x: px, y: py } = latLngToTile(point.lat, point.lng, zoom);
              const offsetX = (px - cx) * 256 + 128;
              const offsetY = (py - cy) * 256 + 128;
              return (
                <div
                  key={point.id}
                  className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow-md"
                  style={{ left: `${offsetX}px`, top: `${offsetY}px` }}
                  title={point.title}
                />
              );
            })}
        </div>
      );
    }
    if (type === "interactive" && LazyLeafletMap && isMounted) {
      return (
        <React.Suspense
          fallback={
            <div className="text-neutral-content flex size-full items-center justify-center">Loading map...</div>
          }
        >
          <div className="size-full" style={filterStyle}>
            <LazyLeafletMap
              lat={lat} lng={lng} zoom={zoom} tileStyle={tileStyle}
              childPoints={childPoints} enabled={false}
            />
          </div>
        </React.Suspense>
      );
    }
    if (type === "interactive") {
      const tileUrl = getStaticTileUrl(lat, lng, zoom, tileStyle);
      return <img src={tileUrl} alt={props.title || `Map at ${lat}, ${lng}`} className="size-full object-cover" loading="lazy" />;
    }
    return null;
  };

  const prop: any = {
    className: `overflow-hidden ${props.className || ""}`,
    role: "region",
    "aria-label": props.title || "Map",
    children: renderMapContent(),
  };
  applyAriaProps(prop, props);
  return React.createElement(motionIt(props, "div", false), applyAnimation({ ...prop, key: id }, props, null, false));
};
