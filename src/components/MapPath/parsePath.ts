/**
 * Coordinate-list parsing shared by every Map render path (editor, viewer,
 * static export). NO React, NO `@craftjs/core` — importable from `toHTML` too.
 */

export interface LatLng {
  lat: number;
  lng: number;
  /** Optional step badge drawn at this waypoint (third field on the line). */
  label?: string;
}

/**
 * Accepts a newline- / semicolon- / pipe-separated list of `lat,lng` pairs,
 * each with an OPTIONAL third field that becomes a step badge at that point:
 *
 *   34.16128,-118.30041,1
 *   34.16145,-118.30037
 *   34.16167,-118.30034,2
 *
 * Two-field lines stay valid, so existing routes keep working — a waypoint
 * without a third field is a shape point and draws no badge. The label is not
 * split on further commas, so "Enter here, then left" survives intact.
 *
 * An array of `{ lat, lng, label? }` is accepted too, so a caller that already
 * holds structured coordinates does not have to serialise them first.
 *
 * Malformed entries are dropped rather than throwing: a half-typed coordinate
 * in the editor should shorten the line, not blank the whole map.
 */
export function parseLatLngList(raw: unknown): LatLng[] {
  if (Array.isArray(raw)) {
    return raw
      .map(p => ({
        lat: Number((p as any)?.lat),
        lng: Number((p as any)?.lng),
        label: (p as any)?.label ? String((p as any).label) : undefined,
      }))
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  }
  if (typeof raw !== "string") return [];
  return raw
    .split(/[\n;|]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      const parts = s.split(",");
      const label = parts.slice(2).join(",").trim();
      return {
        lat: Number(parts[0]?.trim()),
        lng: Number(parts[1]?.trim()),
        label: label || undefined,
      };
    })
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

/** Leaflet/SVG dash pattern for a `dashed` path at the given stroke weight. */
export function dashArrayFor(weight: number): string {
  const w = Math.max(1, weight || 1);
  return `${w * 2} ${w * 1.8}`;
}
