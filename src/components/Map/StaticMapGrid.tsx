/** Non-interactive tile grid shared by the editor and viewer Map paths. NO `@craftjs/core`. */
import React from "react";
import { dashArrayFor } from "../MapPath/parsePath";
import {
  buildStaticMapPlan,
  MARKER_COLOR,
  TILE_SIZE,
  type StaticMapPath,
  type StaticMapPoint,
} from "./tiles";

export interface StaticMapGridProps {
  lat: number;
  lng: number;
  zoom: number;
  tileStyle: string;
  /** Draw marker dots + route lines for the child nodes (`static` does, `background` doesn't). */
  showMarkers?: boolean;
  points?: StaticMapPoint[];
  paths?: StaticMapPath[];
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
  lat, lng, zoom, tileStyle, showMarkers = false, points = [], paths = [],
  width, height, grayscale = false, alt = "",
}: StaticMapGridProps) => {
  const plan = buildStaticMapPlan({
    lat, lng, zoom, tileStyle, width, height,
    points: showMarkers ? points : [],
    paths: showMarkers ? paths : [],
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
            // Eager, deliberately. These tiles are absolutely positioned inside
            // an `overflow-hidden` frame that is itself translated -50%/-50%, and
            // several sit outside the frame's box. Browsers judge `loading="lazy"`
            // against that geometry, so tiles could stay unfetched even with the
            // map on screen — the section renders as an empty bordered rectangle
            // with no error, which reads as a broken map rather than a slow one.
            // A map is never decorative, and the whole grid is ~70KB.
            loading="eager"
            decoding="async"
            draggable={false}
            className="absolute max-w-none select-none"
            style={{ left: `${t.left}px`, top: `${t.top}px`, width: `${TILE_SIZE}px`, height: `${TILE_SIZE}px` }}
          />
        ))}
        {plan.paths.length > 0 && (
          // One overlay for every route, sized to the grid so the projected
          // px offsets land in the same frame as the markers. Markers render
          // after this so pins always sit on top of the line.
          <svg
            className="pointer-events-none absolute left-0 top-0"
            width={plan.width}
            height={plan.height}
            viewBox={`0 0 ${plan.width} ${plan.height}`}
            aria-hidden
          >
            {plan.paths.map(p => (
              <polyline
                key={p.id}
                points={p.points.map(pt => `${pt.left},${pt.top}`).join(" ")}
                fill="none"
                stroke={p.color}
                strokeWidth={p.weight}
                strokeOpacity={p.opacity}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={p.dashed ? dashArrayFor(p.weight) : undefined}
              />
            ))}
            {plan.paths.flatMap(p =>
              p.badges.map((b, i) => (
                // Filled disc + centred glyph, sized to the text so "1" and
                // "Turn in" both sit inside the pill.
                <g key={`${p.id}-badge-${i}`} transform={`translate(${b.left} ${b.top})`}>
                  <rect
                    x={-(Math.max(11, b.label.length * 4 + 8))} y={-11}
                    width={Math.max(11, b.label.length * 4 + 8) * 2} height={22}
                    rx={11} fill={p.color}
                    stroke="var(--color-base-100)" strokeWidth={2}
                  />
                  <text
                    textAnchor="middle" dy="4.5"
                    fill="var(--color-base-100)"
                    fontSize={12} fontWeight={800} fontFamily="inherit"
                  >
                    {b.label}
                  </text>
                </g>
              ))
            )}
            {plan.paths
              .filter(p => p.label)
              .map(p => (
                // Painted twice: a fat light stroke first as a halo, then the
                // fill. Map tiles are busy and a single-pass label is unreadable
                // over dark imagery.
                <g key={`${p.id}-label`} transform={`translate(${p.labelAt.left} ${p.labelAt.top})`}>
                  <text
                    textAnchor="middle" dy="-10"
                    stroke="var(--color-base-100)" strokeWidth={4} strokeLinejoin="round"
                    fontSize={13} fontWeight={700} fontFamily="inherit"
                  >
                    {p.label}
                  </text>
                  <text
                    textAnchor="middle" dy="-10"
                    fill={p.color} fontSize={13} fontWeight={700} fontFamily="inherit"
                  >
                    {p.label}
                  </text>
                </g>
              ))}
          </svg>
        )}
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
