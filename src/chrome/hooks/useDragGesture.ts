import React from "react";

export interface DragGestureMove {
  /** Delta from pointerdown in screen pixels (no zoom transform). */
  dx: number;
  dy: number;
  /** Current screen-space client position. */
  clientX: number;
  clientY: number;
}

export interface DragGestureStart {
  clientX: number;
  clientY: number;
}

export interface UseDragGestureOptions {
  /** Fired on pointerdown (after button-0 guard). Return false to abort. */
  onStart?: (e: React.PointerEvent, pos: DragGestureStart) => boolean | void;
  /** Fired on each pointermove (after `buttons === 0` missed-up guard). */
  onMove?: (e: PointerEvent, m: DragGestureMove) => void;
  /** Fired exactly once on pointerup / pointercancel / blur / missed-up.
   *  `moved` is true when the pointer travelled past `threshold`. */
  onEnd?: (e: PointerEvent | null, moved: boolean) => void;
  /** Pixel distance before `moved` flips true. Default 1. */
  threshold?: number;
}

/**
 * Window-listener pointer gesture primitive. Replaces React `onPointerMove`/
 * `onPointerUp` JSX props (which strand the gesture if the up event misses,
 * the element re-renders mid-drag, an overlay swallows the event, the pointer
 * leaves the document, or focus is stolen).
 *
 * Wires:
 * - pointerdown → button-0 guard → onStart → attach window listeners
 * - pointermove → `buttons === 0` missed-up guard → onMove
 * - pointerup / pointercancel / blur → onEnd → detach
 * - unmount → detach in-flight listeners (no stale closures)
 *
 * The hook is gesture-shape agnostic — coordinate-space transforms (zoom,
 * normalize to %, element-relative), DOM mutation, and rAF coalescing live in
 * the caller's onMove.
 */
export function useDragGesture(options: UseDragGestureOptions) {
  const { threshold = 1 } = options;

  // Keep callbacks fresh — pointermove fires from window listeners attached at
  // pointerdown, so without refs the captured closures would see stale state
  // from the render where the drag began.
  const onStartRef = React.useRef(options.onStart);
  const onMoveRef = React.useRef(options.onMove);
  const onEndRef = React.useRef(options.onEnd);
  React.useEffect(() => {
    onStartRef.current = options.onStart;
    onMoveRef.current = options.onMove;
    onEndRef.current = options.onEnd;
  });

  const startRef = React.useRef<DragGestureStart | null>(null);
  const movedRef = React.useRef(false);
  const moveListenerRef = React.useRef<((e: PointerEvent) => void) | null>(null);
  const endListenerRef = React.useRef<((e: PointerEvent) => void) | null>(null);
  const blurListenerRef = React.useRef<(() => void) | null>(null);

  const detachListeners = React.useCallback(() => {
    if (moveListenerRef.current) {
      window.removeEventListener("pointermove", moveListenerRef.current);
      moveListenerRef.current = null;
    }
    if (endListenerRef.current) {
      window.removeEventListener("pointerup", endListenerRef.current);
      window.removeEventListener("pointercancel", endListenerRef.current);
      endListenerRef.current = null;
    }
    if (blurListenerRef.current) {
      window.removeEventListener("blur", blurListenerRef.current);
      blurListenerRef.current = null;
    }
  }, []);

  const finish = React.useCallback(
    (e: PointerEvent | null) => {
      if (!startRef.current) return;
      detachListeners();
      const moved = movedRef.current;
      startRef.current = null;
      movedRef.current = false;
      onEndRef.current?.(e, moved);
    },
    [detachListeners]
  );

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      detachListeners();
      const start: DragGestureStart = { clientX: e.clientX, clientY: e.clientY };
      const aborted = onStartRef.current?.(e, start) === false;
      if (aborted) return;
      startRef.current = start;
      movedRef.current = false;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // window listeners cover this — capture is a bonus
      }

      const move = (ev: PointerEvent) => {
        if (!startRef.current) return;
        if (ev.buttons === 0) {
          // Missed pointerup (mouseup over an overlay, off-document release,
          // browser quirk). Treat as implicit end.
          finish(ev);
          return;
        }
        const dx = ev.clientX - startRef.current.clientX;
        const dy = ev.clientY - startRef.current.clientY;
        if (!movedRef.current && Math.hypot(dx, dy) >= threshold) {
          movedRef.current = true;
        }
        onMoveRef.current?.(ev, { dx, dy, clientX: ev.clientX, clientY: ev.clientY });
      };
      const end = (ev: PointerEvent) => finish(ev);
      const blur = () => finish(null);

      moveListenerRef.current = move;
      endListenerRef.current = end;
      blurListenerRef.current = blur;
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      window.addEventListener("blur", blur);
    },
    [detachListeners, finish, threshold]
  );

  React.useEffect(() => {
    return () => {
      // If a gesture is in flight when the component unmounts, fire onEnd so
      // the caller can clean up side effects it set in onStart (body cursor,
      // user-select, scrollBehavior, etc). Without this, those side effects
      // leak globally until the next drag.
      const wasActive = startRef.current !== null;
      const moved = movedRef.current;
      detachListeners();
      startRef.current = null;
      movedRef.current = false;
      if (wasActive) onEndRef.current?.(null, moved);
    };
  }, [detachListeners]);

  return { onPointerDown };
}
