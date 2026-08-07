import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useRef, useState } from "react";
import { TbMap } from "react-icons/tb";
import { getClonedState, setClonedProps } from "../../utils/cloneState";
import { motionIt } from "../../utils/motion";
import { applyAnimation } from "../../utils/tailwind/tailwind";
import { useMounted } from "../../utils/hooks/useMounted";

import { BaseSelectorProps, applyAriaProps } from "../selectors";
import { parseLatLngList } from "../MapPath/parsePath";
import { StaticMapGrid } from "./StaticMapGrid";
import { PATH_COLOR, type StaticMapPath } from "./tiles";

const LazyLeafletMap =
  typeof window !== "undefined" ? React.lazy(() => import("./MapLeaflet")) : null;

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
  // Extract child MapPath nodes
  let childPaths: StaticMapPath[] = [];
  if (isMounted) {
    try {
      const node = query.node(id).get();
      const childIds = node.data.nodes || [];
      childPoints = childIds
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
      childPaths = childIds
        .map(childId => {
          try {
            const childNode = query.node(childId).get();
            if (childNode.data.name !== "MapPath") return null;
            const p = childNode.data.props;
            const pts = parseLatLngList(p.path);
            if (pts.length < 2) return null;
            return {
              id: childId,
              points: pts,
              color: p.color || PATH_COLOR,
              weight: Number(p.weight) || 4,
              opacity: p.opacity == null ? 1 : Number(p.opacity),
              dashed: p.dashed !== false,
              title: p.title || "",
              label: p.label || "",
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean) as StaticMapPath[];
    } catch {
      childPoints = [];
      childPaths = [];
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
      return (
        <StaticMapGrid
          lat={lat}
          lng={lng}
          zoom={zoom}
          tileStyle={tileStyle}
          showMarkers={type === "static"}
          points={childPoints}
          paths={childPaths}
          width={props.staticWidth}
          height={props.staticHeight}
          grayscale={!!grayscale}
          alt={props.title || `Map at ${lat}, ${lng}`}
        />
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
              childPaths={childPaths}
              enabled={enabled}
            />
          </div>
        </React.Suspense>
      );
    }

    // SSR fallback for interactive — same grid so the frame doesn't jump when
    // Leaflet mounts over it.
    if (type === "interactive" && !isMounted) {
      return (
        <StaticMapGrid
          lat={lat}
          lng={lng}
          zoom={zoom}
          tileStyle={tileStyle}
          showMarkers
          points={childPoints}
          paths={childPaths}
          width={props.staticWidth}
          height={props.staticHeight}
          grayscale={!!grayscale}
          alt={props.title || `Map at ${lat}, ${lng}`}
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
    canMoveIn: nodes =>
      nodes.every(node => node.data?.name === "MapPoint" || node.data?.name === "MapPath"),
  },
};
