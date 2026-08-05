/** Non-interactive tile grid shared by the editor and viewer Map paths. NO `@craftjs/core`. */
import React from "react";
import { buildStaticMapPlan, MARKER_COLOR, TILE_SIZE, type StaticMapPoint } from "./tiles";

export interface StaticMapGridProps {
  lat: number;
  lng: number;
  zoom: number;
  tileStyle: string;
  /** Draw marker dots for the child MapPoints (`static` does, `background` doesn't). */
  showMarkers?: boolean;
  points?: StaticMapPoint[];
  width?: number;
  height?: number;
  grayscale?: boolean;
  alt?: string;
}

/**
 * Renders real 256px tiles at native resolution, centred on `lat`/`lng`, and
 * clipped by the caller's box. The grid is positioned dead-centre so the
 * requested coordinate is always the visual centre regardless of container
 * size — which is also what makes the marker offsets land correctly.
 */
export const StaticMapGrid = ({
  lat, lng, zoom, tileStyle, showMarkers = false, points = [],
  width, height, grayscale = false, alt = "",
}: StaticMapGridProps) => {
  const plan = buildStaticMapPlan({
    lat, lng, zoom, tileStyle, width, height,
    points: showMarkers ? points : [],
  });

  return (
    <div
      className="relative size-full overflow-hidden"
      style={grayscale ? { filter: "grayscale(1)" } : undefined}
    >
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: `${plan.width}px`,
          height: `${plan.height}px`,
          transform: "translate(-50%, -50%)",
        }}
      >
        {plan.tiles.map((t, i) => (
          <img
            key={t.key}
            src={t.url}
            // One tile carries the whole map's alt text; the rest are decorative
            // so screen readers don't read the same label N times.
            alt={i === 0 ? alt : ""}
            aria-hidden={i === 0 ? undefined : true}
            width={TILE_SIZE}
            height={TILE_SIZE}
            loading="lazy"
            draggable={false}
            className="absolute max-w-none select-none"
            style={{ left: `${t.left}px`, top: `${t.top}px`, width: `${TILE_SIZE}px`, height: `${TILE_SIZE}px` }}
          />
        ))}
        {plan.markers.map(m => (
          <div
            key={m.id}
            className="absolute rounded-full shadow-md"
            style={{
              left: `${m.left}px`,
              top: `${m.top}px`,
              width: "12px",
              height: "12px",
              background: MARKER_COLOR,
              transform: "translate(-50%, -50%)",
            }}
            title={m.title || undefined}
          />
        ))}
      </div>
    </div>
  );
};
