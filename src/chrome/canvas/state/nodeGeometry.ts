/**
 * Shared geometry helpers for canvas chrome (resize, rotate, debug overlays).
 *
 * `getBoundingClientRect()` returns the axis-aligned bounding box of a rotated
 * element — bigger than the element itself and not aligned to its visual edges.
 * For accurate edge/corner detection we need the element's UN-rotated rect plus
 * its rotation angle, then we can transform cursor positions into the element's
 * local frame.
 */

export interface NodeGeometry {
  /** Element center in screen-pixel coords (rotation preserves center). */
  cx: number;
  cy: number;
  /** Un-rotated dimensions (offsetWidth/Height — pre-transform CSS pixels). */
  w: number;
  h: number;
  /** Rotation in degrees (CSS convention: positive = clockwise on screen). */
  angle: number;
  /**
   * Convert a screen-pixel point into element-local coords (origin at center,
   * +x along the element's rotated x-axis). Used for hit detection.
   */
  toLocal: (x: number, y: number) => { x: number; y: number };
}

function readRotationDeg(el: HTMLElement): number {
  const cs = window.getComputedStyle(el);
  let total = 0;

  // CSS `rotate` property (Tailwind v4's `rotate-[Ndeg]` writes here).
  const r = (cs as any).rotate as string | undefined;
  if (r && r !== "none") {
    const m = r.match(/(-?\d+(?:\.\d+)?)deg/);
    if (m) total += parseFloat(m[1]);
  }

  // `transform` property (older syntax / inline style).
  const t = cs.transform;
  if (t && t !== "none") {
    let m = t.match(/matrix\(([^)]+)\)/);
    if (!m) m = t.match(/matrix3d\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(",").map(parseFloat);
      total += Math.atan2(p[1], p[0]) * (180 / Math.PI);
    }
  }

  return total;
}

export function getNodeGeometry(el: HTMLElement): NodeGeometry {
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  const angle = readRotationDeg(el);
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    cx,
    cy,
    w,
    h,
    angle,
    toLocal(x: number, y: number) {
      const dx = x - cx;
      const dy = y - cy;
      return {
        x: dx * cos + dy * sin,
        y: -dx * sin + dy * cos,
      };
    },
  };
}

/**
 * Project a screen-space delta (dx, dy) onto the element's local axes.
 * Used by resize drag math so dragging the rotated right edge grows the width
 * along the rotated x-axis instead of the screen x-axis.
 */
export function projectToLocalAxis(
  dxScreen: number,
  dyScreen: number,
  angleDeg: number
): {
  dx: number;
  dy: number;
} {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    dx: dxScreen * cos + dyScreen * sin,
    dy: -dxScreen * sin + dyScreen * cos,
  };
}
