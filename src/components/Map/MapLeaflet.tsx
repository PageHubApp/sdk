import React, { useEffect } from "react";
import {
  MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import { dashArrayFor } from "../MapPath/parsePath";
import {
  LEAFLET_CSS, MARKER_ICON_2X_URL, MARKER_ICON_URL, MARKER_SHADOW_URL,
} from "./leafletAssets.generated";
import { PATH_COLOR, type StaticMapPath } from "./tiles";

const LEAFLET_STYLE_ID = "ph-leaflet-css";

// Leaflet points `L.Icon.Default` at relative paths that only resolve when the
// library is served from its own directory, so every bundler has to be told
// where the marker art actually is.
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: MARKER_ICON_2X_URL,
  iconUrl: MARKER_ICON_URL,
  shadowUrl: MARKER_SHADOW_URL,
});

const TILE_URLS = {
  osm: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  "cartodb-positron": "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  "cartodb-dark": "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  "cartodb-voyager": "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
};

const TILE_ATTRIBUTIONS = {
  osm: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  "cartodb-positron":
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  "cartodb-dark":
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
  "cartodb-voyager":
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
};

interface MapLeafletProps {
  lat: number;
  lng: number;
  zoom: number;
  tileStyle: string;
  childPoints: Array<{
    id: string;
    lat: number;
    lng: number;
    title: string;
    description: string;
  }>;
  childPaths?: StaticMapPath[];
  enabled: boolean;
}

const MapLeaflet = ({
  lat, lng, zoom, tileStyle, childPoints, childPaths = [], enabled,
}: MapLeafletProps) => {
  // Leaflet's own stylesheet, injected once per document. Carried as a string
  // rather than imported so it reaches viewer-only consumers too — see
  // `./leafletAssets.generated`.
  useEffect(() => {
    if (document.getElementById(LEAFLET_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = LEAFLET_STYLE_ID;
    style.textContent = LEAFLET_CSS;
    document.head.appendChild(style);
  }, []);

  const tileUrl = TILE_URLS[tileStyle] || TILE_URLS.osm;
  const attribution = TILE_ATTRIBUTIONS[tileStyle] || TILE_ATTRIBUTIONS.osm;

  // isolation: isolate creates a new stacking context that traps Leaflet's
  // internal z-indexes (panes 400, controls 1000, popups 700) so they can't
  // paint over fixed headers / overlays in the host page.
  return (
    <div style={{ width: "100%", height: "100%", isolation: "isolate" }}>
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: enabled ? "none" : "auto",
        }}
        scrollWheelZoom={!enabled}
        dragging={!enabled}
        zoomControl={!enabled}
        doubleClickZoom={!enabled}
        touchZoom={!enabled}
      >
        <TileLayer url={tileUrl} attribution={attribution} />
        {/* Routes first so pins always sit on top of the line. */}
        {childPaths.map(p => (
          <Polyline
            key={p.id}
            positions={p.points.map(pt => [pt.lat, pt.lng] as [number, number])}
            pathOptions={{
              color: p.color || PATH_COLOR,
              weight: p.weight ?? 4,
              opacity: p.opacity ?? 1,
              lineCap: "round",
              lineJoin: "round",
              dashArray: p.dashed !== false ? dashArrayFor(p.weight ?? 4) : undefined,
            }}
          >
            {p.label && (
              // `permanent` so the caption is always on screen — a hover-only
              // tooltip is useless on the touch devices most visitors use to
              // find the place.
              <Tooltip permanent direction="center" className="ph-map-path-label">
                {p.label}
              </Tooltip>
            )}
          </Polyline>
        ))}
        {/* Step badges at any waypoint that carried a third field. */}
        {childPaths.flatMap(p =>
          (p.points || [])
            .filter(pt => (pt as any).label)
            .map((pt, i) => (
              <CircleMarker
                key={`${p.id}-badge-${i}`}
                center={[pt.lat, pt.lng]}
                radius={11}
                pathOptions={{
                  color: "#fff",
                  weight: 2,
                  fillColor: p.color || PATH_COLOR,
                  fillOpacity: 1,
                }}
              >
                <Tooltip permanent direction="center" className="ph-map-step-badge">
                  {(pt as any).label}
                </Tooltip>
              </CircleMarker>
            ))
        )}
        {childPoints.map(point => (
          <Marker key={point.id} position={[point.lat, point.lng]}>
            {(point.title || point.description) && (
              <Popup>
                {point.title && <strong>{point.title}</strong>}
                {point.title && point.description && <br />}
                {point.description && <span>{point.description}</span>}
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapLeaflet;
