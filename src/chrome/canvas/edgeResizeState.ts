/**
 * Shared "is the user currently engaging with edge resize?" flag.
 *
 * BorderResizeController sets this true when:
 *   (a) the cursor is hovering on a resizable element's edge band, OR
 *   (b) an active resize drag is in flight.
 *
 * PaddingOverlay reads it to suppress its own hover detection / overlay so the
 * two systems don't fight over the same cursor zone.
 *
 * Plain module-level flag + listeners — no need for a full atom for this.
 */

let active = false;
const listeners = new Set<(v: boolean) => void>();

export function setEdgeResizeActive(value: boolean): void {
  if (active === value) return;
  active = value;
  listeners.forEach(fn => fn(value));
}

export function isEdgeResizeActive(): boolean {
  return active;
}

export function subscribeEdgeResize(fn: (v: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
