/**
 * Shared "is a rotation drag in flight?" flag.
 *
 * RotateHandleController sets this true for the duration of an active rotate
 * drag. BorderResizeController reads it to suppress its own hover detection +
 * mousedown handling so the resize cursor/affordance doesn't fire while the
 * user sweeps the cursor across edge bands during rotation.
 *
 * Same shape as edgeResizeState — module-level flag + listeners.
 */

let active = false;
const listeners = new Set<(v: boolean) => void>();

export function setRotateActive(value: boolean): void {
  if (active === value) return;
  active = value;
  listeners.forEach(fn => fn(value));
}

export function isRotateActive(): boolean {
  return active;
}

export function subscribeRotate(fn: (v: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
