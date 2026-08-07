import React from "react";
import { motionIt } from "../../utils/motion";
import { applyAnimation } from "../../utils/tailwind/tailwind";
import { applyAriaProps } from "../selectors";
import { useMounted } from "../../utils/hooks/useMounted";
import { useWalkerNode } from "../../render/react/contexts";
import type { MapProps } from "./Map.body";
import { StaticMapGrid } from "./StaticMapGrid";
import type { StaticMapPath } from "./tiles";

const LazyLeafletMap =
  typeof window !== "undefined" ? React.lazy(() => import("./MapLeaflet")) : null;

interface ChildPoint {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
}

export const MapRender = (
  incomingProps: MapProps & { childPoints?: ChildPoint[]; childPaths?: StaticMapPath[] }
) => {
  const props: any = {
    lat: 51.505, lng: -0.09, zoom: 13,
    type: "interactive", tileStyle: "osm", grayscale: false, title: "",
    ...incomingProps,
  };
  const id = useWalkerNode()?.id ?? "";
  const isMounted = useMounted();
  const childPoints: ChildPoint[] = props.childPoints ?? [];
  const childPaths: StaticMapPath[] = props.childPaths ?? [];
  const { lat, lng, zoom, type, tileStyle, grayscale } = props;
  const hasLocation = lat !== 0 || lng !== 0;
  const filterStyle = grayscale ? { filter: "grayscale(1)" } : {};

  const renderMapContent = () => {
    if (!hasLocation) return null;
    if (type === "background" || type === "static") {
      return (
        <StaticMapGrid
          lat={lat} lng={lng} zoom={zoom} tileStyle={tileStyle}
          showMarkers={type === "static"}
          points={childPoints}
          paths={childPaths}
          width={props.staticWidth} height={props.staticHeight}
          grayscale={!!grayscale}
          alt={props.title || `Map at ${lat}, ${lng}`}
        />
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
              childPoints={childPoints} childPaths={childPaths} enabled={false}
            />
          </div>
        </React.Suspense>
      );
    }
    if (type === "interactive") {
      // Pre-hydration placeholder — same grid so the frame doesn't jump when
      // Leaflet mounts over it.
      return (
        <StaticMapGrid
          lat={lat} lng={lng} zoom={zoom} tileStyle={tileStyle}
          showMarkers points={childPoints} paths={childPaths}
          width={props.staticWidth} height={props.staticHeight}
          grayscale={!!grayscale}
          alt={props.title || `Map at ${lat}, ${lng}`}
        />
      );
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
