import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useRef, useState } from "react";
import { TbMap } from "react-icons/tb";
import { getClonedState, setClonedProps } from "../../utils/cloneState";
import { motionIt } from "../../utils/motion";
import { applyAnimation } from "../../utils/tailwind/tailwind";
import { useMounted } from "../../utils/hooks";

import { BaseSelectorProps, applyAriaProps } from "../selectors";

const LazyLeafletMap =
  typeof window !== "undefined" ? React.lazy(() => import("./MapLeaflet")) : null;

export type MapDisplayType = "background" | "static" | "interactive";
export type TileStyle = "osm" | "cartodb-positron" | "cartodb-dark" | "cartodb-voyager";

const TILE_URLS: Record<TileStyle, string> = {
  osm: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  "cartodb-positron": "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
  "cartodb-dark": "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
  "cartodb-voyager": "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
};

export interface MapProps extends BaseSelectorProps {
  lat: number;
  lng: number;
  zoom: number;
  type: MapDisplayType;
  tileStyle: TileStyle;
  grayscale: boolean | string;
  title?: string;
}

/**
 * Convert lat/lng/zoom to OSM tile coordinates.
 * See: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
 */
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

export const Map = (incomingProps: MapProps) => {
  let props: any = {
    lat: 51.505,
    lng: -0.09,
    zoom: 13,
    type: "interactive",
    tileStyle: "osm",
    grayscale: false,
    title: "",
    ...incomingProps,
  };

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  const { query, enabled } = useEditor(state => getClonedState(props, state));

  props = setClonedProps(props, query);

  const ref = useRef<HTMLElement | null>(null);
  const isMounted = useMounted();

  // Extract child MapPoint nodes
  let childPoints: Array<{
    id: string;
    lat: number;
    lng: number;
    title: string;
    description: string;
  }> = [];
  if (isMounted) {
    try {
      const node = query.node(id).get();
      childPoints = (node.data.nodes || [])
        .map(childId => {
          try {
            const childNode = query.node(childId).get();
            if (childNode.data.name === "MapPoint") {
              return {
                id: childId,
                lat: parseFloat(childNode.data.props.lat) || 0,
                lng: parseFloat(childNode.data.props.lng) || 0,
                title: childNode.data.props.title || "",
                description: childNode.data.props.description || "",
              };
            }
            return null;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    } catch {
      childPoints = [];
    }
  }

  const { lat, lng, zoom, type, tileStyle, grayscale } = props;

  const hasLocation = lat !== 0 || lng !== 0;

  // Filter style for grayscale
  const filterStyle = grayscale ? { filter: "grayscale(1)" } : {};

  // Render map content based on type
  const renderMapContent = () => {
    if (!hasLocation && !enabled) return null;

    if (!hasLocation && enabled) {
      return (
        <div className="flex size-full items-center justify-center text-3xl">
          <TbMap aria-label="Map icon" />
        </div>
      );
    }

    if (type === "background" || type === "static") {
      const tileUrl = getStaticTileUrl(lat, lng, zoom, tileStyle);
      return (
        <div className="relative size-full" style={filterStyle}>
          <img
            src={tileUrl}
            alt={props.title || `Map at ${lat}, ${lng}`}
            className="size-full object-cover"
            loading="lazy"
          />
          {/* Render marker dots for static mode */}
          {type === "static" &&
            childPoints.length > 0 &&
            childPoints.map(point => {
              // For single-tile static, approximate marker position
              // This is a simple center-offset calculation
              const { x: centerTileX, y: centerTileY } = latLngToTile(lat, lng, zoom);
              const { x: pointTileX, y: pointTileY } = latLngToTile(point.lat, point.lng, zoom);
              const offsetX = (pointTileX - centerTileX) * 256 + 128;
              const offsetY = (pointTileY - centerTileY) * 256 + 128;
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

    // Interactive mode
    if (type === "interactive" && LazyLeafletMap && isMounted) {
      return (
        <React.Suspense
          fallback={
            <div className="text-neutral-content flex size-full items-center justify-center">
              Loading map...
            </div>
          }
        >
          <div className="size-full" style={filterStyle}>
            <LazyLeafletMap
              lat={lat}
              lng={lng}
              zoom={zoom}
              tileStyle={tileStyle}
              childPoints={childPoints}
              enabled={enabled}
            />
          </div>
        </React.Suspense>
      );
    }

    // SSR fallback for interactive — show static tile
    if (type === "interactive" && !isMounted) {
      const tileUrl = getStaticTileUrl(lat, lng, zoom, tileStyle);
      return (
        <img
          src={tileUrl}
          alt={props.title || `Map at ${lat}, ${lng}`}
          className="size-full object-cover"
          loading="lazy"
        />
      );
    }

    return null;
  };

  const prop: any = {
    ref: r => {
      ref.current = r;
      connect(drag(r));
    },
    className: `overflow-hidden ${props.className || ""}`,
    role: "region",
    "aria-label": props.title || "Map",
    children: renderMapContent(),
  };

  applyAriaProps(prop, props);

  if (enabled) {
    prop["data-bounding-box"] = enabled;
    prop["data-empty-state"] = !hasLocation;
    if (isMounted) {
      prop["node-id"] = id;
    }
  }

  // Render hidden children container so CraftJS tracks MapPoint nodes
  if (enabled && isMounted) {
    prop.style = {
      ...(prop.style || {}),
      overflow: "visible",
    };
    const originalChildren = prop.children;
    prop.children = (
      <>
        {originalChildren}
        {/* Hidden container for CraftJS child node tracking */}
        <div style={{ display: "none" }}>{props.children}</div>
      </>
    );
  } else if (!enabled) {
    // In live mode, still need children in DOM for CraftJS deserialization
    // but MapPoint returns null so nothing renders
    const originalChildren = prop.children;
    prop.children = (
      <>
        {originalChildren}
        {props.children}
      </>
    );
  }

  return React.createElement(
    motionIt(props, "div", enabled),
    applyAnimation({ ...prop, key: id }, props, null, enabled)
  );
};

Map.craft = {
  displayName: "Map",
  rules: {
    canDrag: () => true,
    canMoveIn: nodes => nodes.every(node => node.data?.name === "MapPoint"),
  },
};
