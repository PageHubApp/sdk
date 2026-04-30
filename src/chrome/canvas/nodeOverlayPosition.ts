/**
 * Shared positioning math for canvas chrome that overlays a selected element
 * inside #viewport. Returns a rotated-wrapper rect in portal-local (pre-zoom)
 * pixels so children can use 0/100% / right/bottom-relative coords without
 * worrying about the screen-px ↔ portal-px ↔ rotated-frame conversions.
 *
 * Used by BorderResizeController + RotateHandleController hover affordances.
 */

import { getNodeGeometry, type NodeGeometry } from "./nodeGeometry";

export interface NodeOverlayPosition {
  /** Wrapper top-left in portal-local (pre-zoom) px. */
  left: number;
  top: number;
  /** Un-rotated dimensions (offsetWidth/Height). */
  width: number;
  height: number;
  /** Rotation to apply to the wrapper (degrees, CSS clockwise-positive). */
  angle: number;
  /** Underlying geometry, in case callers need cx/cy/toLocal. */
  geometry: NodeGeometry;
}

export function getNodeOverlayPosition(
  el: HTMLElement,
  portalTarget: HTMLElement
): NodeOverlayPosition {
  const g = getNodeGeometry(el);
  const portalRect = portalTarget.getBoundingClientRect();
  // #viewport sits inside a parent with CSS `zoom`. getBoundingClientRect
  // returns post-zoom screen px; offsetWidth/Height returns pre-zoom px. To
  // place the wrapper using offsetWidth-sized children, we must convert the
  // center into pre-zoom coords first.
  const zoomVal =
    parseFloat(getComputedStyle(portalTarget.parentElement || portalTarget).zoom) || 1;
  const localCx = (g.cx - portalRect.left) / zoomVal + portalTarget.scrollLeft;
  const localCy = (g.cy - portalRect.top) / zoomVal + portalTarget.scrollTop;
  return {
    left: localCx - g.w / 2,
    top: localCy - g.h / 2,
    width: g.w,
    height: g.h,
    angle: g.angle,
    geometry: g,
  };
}
