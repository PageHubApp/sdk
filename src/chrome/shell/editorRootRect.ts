/**
 * The editor root's box (`.pagehub-sdk-root`), for chrome that sizes itself
 * to "the editor" rather than the browser window: the overlay-vs-docked
 * sidebar switch, canvas fit-to-window, sidebar-anchored dialogs.
 *
 * In the default layout the root fills the window, so the numbers match the window. A
 * host that puts the editor in part of its page (the dashboard's content
 * column) gets that part's size instead.
 *
 * `PageHubEditor` creates one store per mount and observes its root with
 * `observe`. Outside an editor (or before the root mounts) the hooks fall back
 * to the window.
 */
import { createContext, useContext } from "react";
import { createValueStore, useValueStore, type ValueStore } from "../../utils/createValueStore";

export interface EditorRootRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

type RectStore = Pick<ValueStore<EditorRootRect>, "get" | "subscribe">;

const SERVER_RECT: EditorRootRect = { top: 0, left: 0, width: 1024, height: 768 };

function sameRect(a: EditorRootRect, b: EditorRootRect): boolean {
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

function readWindowRect(): EditorRootRect {
  if (typeof window === "undefined") return SERVER_RECT;
  return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
}

/** Window fallback: one shared store, updated on resize while anything listens. */
const windowStore: RectStore = (() => {
  const store = createValueStore(readWindowRect(), sameRect);
  let detach: (() => void) | null = null;
  let count = 0;
  return {
    get: store.get,
    subscribe(listener: () => void) {
      if (count++ === 0 && typeof window !== "undefined") {
        const onResize = () => store.set(readWindowRect());
        window.addEventListener("resize", onResize);
        detach = () => window.removeEventListener("resize", onResize);
        onResize();
      }
      const off = store.subscribe(listener);
      return () => {
        off();
        if (--count === 0) {
          detach?.();
          detach = null;
        }
      };
    },
  };
})();

/**
 * A store for one editor root. `observe(el)` starts measuring (ResizeObserver
 * plus window resize, since a resize elsewhere can move the root) and returns
 * the cleanup. Until then it reports the window.
 */
export function createEditorRootRectStore(): RectStore & { observe(el: HTMLElement): () => void } {
  const store = createValueStore(readWindowRect(), sameRect);
  return {
    get: store.get,
    subscribe: store.subscribe,
    observe(el) {
      const measure = () => {
        const b = el.getBoundingClientRect();
        store.set({
          top: Math.round(b.top),
          left: Math.round(b.left),
          width: Math.round(b.width),
          height: Math.round(b.height),
        });
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      window.addEventListener("resize", measure);
      return () => {
        ro.disconnect();
        window.removeEventListener("resize", measure);
      };
    },
  };
}

export const EditorRootRectContext = createContext<RectStore | null>(null);

/**
 * A value derived from the editor root's box (the window's outside an
 * editor). Re-renders only when the selected value changes, so `select` should
 * return a primitive or one of the rect's own fields.
 */
export function useEditorRootRect<T>(select: (rect: EditorRootRect) => T): T {
  const store = useContext(EditorRootRectContext) ?? windowStore;
  return useValueStore(store, select, SERVER_RECT);
}
