/**
 * Live-component registry — bridges CraftJS-rendered DOM to canvas-mode pinning.
 *
 * `Container.tsx` registers each `type === "component"` element on mount and
 * unregisters on unmount via a ref callback. `ComponentCanvasItem` reads from
 * the registry instead of `document.querySelector`, eliminating the
 * "race between React render and querySelector" failure mode that produced
 * ghost cards / empty slots during transitions.
 *
 * Subscribers fire when an element is added or removed for a given container ID,
 * so canvas items can re-pin on hot-reload, isolation transitions, or any
 * CraftJS re-render that replaces the live DOM — no 60-frame retry needed.
 */

const liveComponents = new Map<string, HTMLElement>();
const subscribers = new Map<string, Set<() => void>>();

function notify(id: string): void {
  const subs = subscribers.get(id);
  if (!subs) return;
  for (const fn of subs) {
    try {
      fn();
    } catch (e) {
      console.error("[componentRegistry] subscriber threw", e);
    }
  }
}

export function registerLiveComponent(id: string, el: HTMLElement | null): void {
  if (!id) return;
  const prev = liveComponents.get(id) ?? null;
  if (el) {
    if (prev === el) return;
    liveComponents.set(id, el);
  } else {
    if (!prev) return;
    liveComponents.delete(id);
  }
  notify(id);
}

export function getLiveComponent(id: string): HTMLElement | null {
  return liveComponents.get(id) ?? null;
}

/** Subscribe to add/remove events for a single container ID. Returns unsub. */
export function subscribeLive(id: string, fn: () => void): () => void {
  let set = subscribers.get(id);
  if (!set) {
    set = new Set();
    subscribers.set(id, set);
  }
  set.add(fn);
  return () => {
    const s = subscribers.get(id);
    if (!s) return;
    s.delete(fn);
    if (s.size === 0) subscribers.delete(id);
  };
}

/** Debug helper — exposed for console inspection during development. */
if (typeof window !== "undefined") {
  (window as any).__phComponentRegistry = {
    size: () => liveComponents.size,
    ids: () => [...liveComponents.keys()],
    get: (id: string) => liveComponents.get(id),
  };
}
