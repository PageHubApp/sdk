/**
 * Tailwind gap scale data and conversion utilities.
 * Extracted from GapDragControl.tsx.
 */

export interface GapEntry {
  class: string;
  px: number;
}

export const TAILWIND_GAPS: GapEntry[] = [
  { class: "gap-0", px: 0 },
  { class: "gap-px", px: 1 },
  { class: "gap-0.5", px: 2 },
  { class: "gap-1", px: 4 },
  { class: "gap-1.5", px: 6 },
  { class: "gap-2", px: 8 },
  { class: "gap-2.5", px: 10 },
  { class: "gap-3", px: 12 },
  { class: "gap-3.5", px: 14 },
  { class: "gap-4", px: 16 },
  { class: "gap-5", px: 20 },
  { class: "gap-6", px: 24 },
  { class: "gap-7", px: 28 },
  { class: "gap-8", px: 32 },
  { class: "gap-9", px: 36 },
  { class: "gap-10", px: 40 },
  { class: "gap-11", px: 44 },
  { class: "gap-12", px: 48 },
  { class: "gap-14", px: 56 },
  { class: "gap-16", px: 64 },
  { class: "gap-20", px: 80 },
  { class: "gap-24", px: 96 },
  { class: "gap-28", px: 112 },
  { class: "gap-32", px: 128 },
  { class: "gap-36", px: 144 },
  { class: "gap-40", px: 160 },
  { class: "gap-44", px: 176 },
  { class: "gap-48", px: 192 },
  { class: "gap-52", px: 208 },
  { class: "gap-56", px: 224 },
  { class: "gap-60", px: 240 },
  { class: "gap-64", px: 256 },
  { class: "gap-72", px: 288 },
  { class: "gap-80", px: 320 },
  { class: "gap-96", px: 384 },
];

/** Lookup from gap class name to pixel value. */
export const GAP_CLASS_TO_PX: Record<string, number> = Object.fromEntries(
  TAILWIND_GAPS.map(g => [g.class, g.px]),
);

/** Snap a pixel value to the nearest Tailwind gap class. */
export function pixelsToGapClass(pixels: number): string {
  let closest = TAILWIND_GAPS[0];
  let minDiff = Math.abs(pixels - closest.px);

  for (const gap of TAILWIND_GAPS) {
    const diff = Math.abs(pixels - gap.px);
    if (diff < minDiff) {
      minDiff = diff;
      closest = gap;
    }
  }

  return closest.class;
}
