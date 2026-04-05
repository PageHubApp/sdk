// @ts-nocheck
import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Fix Leaflet default marker icons (broken by some bundlers, including Vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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
  enabled: boolean;
}

const MapLeaflet = ({ lat, lng, zoom, tileStyle, childPoints, enabled }: MapLeafletProps) => {
  // Inject Leaflet CSS dynamically
  useEffect(() => {
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
  }, []);

  const tileUrl = TILE_URLS[tileStyle] || TILE_URLS.osm;
  const attribution = TILE_ATTRIBUTIONS[tileStyle] || TILE_ATTRIBUTIONS.osm;

  return (
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
  );
};

export default MapLeaflet;
