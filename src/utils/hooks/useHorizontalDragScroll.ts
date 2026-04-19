import {
  useCallback,
  useEffect,
  useRef,
  type MutableRefObject,
  type PointerEventHandler,
  type RefObject,
} from "react";

export interface UseHorizontalDragScrollOptions {
  /** When true, no drag, wheel capture, or click-suppression listeners are registered. */
  disabled?: boolean;
  /** Re-register listeners when content changes (e.g. `items.length`). */
  deps?: readonly unknown[];
  /** Map vertical wheel to `scrollLeft` (theme reel / picker pattern). Default `true` when not disabled. */
  verticalWheelScrollsHorizontal?: boolean;
  /**
   * 0 = scroll tracks the pointer 1:1 (default). 0.08–0.35 = ease each frame toward the target
   * (more "fluid"; higher values feel looser). Ignored when 0 or undefined.
   */
  dragScrollSmoothing?: number;
}

export interface UseHorizontalDragScrollReturn {
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Attach to the horizontal scroller (primary button / touch). */
  onDragPointerDown: PointerEventHandler<HTMLDivElement>;
  /**
   * Set `true` once horizontal drag exceeds a small threshold.
   * Read in child `onClick` handlers to ignore accidental clicks after drag.
   */
  dragMoved: MutableRefObject<boolean>;
}

/**
 * Horizontal overflow: pointer-drag to scroll + optional vertical-wheel → scrollLeft.
 * Move/up listeners attach on pointerdown (window) so touch and mouse share one path.
 */
export function useHorizontalDragScroll(
  options: UseHorizontalDragScrollOptions = {}
): UseHorizontalDragScrollReturn {
  const {
    disabled = false,
    deps = [],
    verticalWheelScrollsHorizontal = true,
    dragScrollSmoothing = 0,
  } = options;

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartScrollLeft = useRef(0);
  const dragMoved = useRef(false);

  const desiredScrollLeft = useRef(0);
  const pointerDown = useRef(false);
  const rafId = useRef<number | null>(null);

  const clearSmoothLoop = useCallback(() => {
    if (rafId.current != null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  const smoothLoop = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !pointerDown.current) {
      rafId.current = null;
      return;
    }
    const target = desiredScrollLeft.current;
    const cur = el.scrollLeft;
    const delta = target - cur;
    const blend = Math.min(1, Math.max(0.06, dragScrollSmoothing));
    if (Math.abs(delta) < 0.35) {
      el.scrollLeft = target;
      rafId.current = null;
      return;
    }
    el.scrollLeft = cur + delta * blend;
    if (pointerDown.current) {
      rafId.current = requestAnimationFrame(smoothLoop);
    } else {
      rafId.current = null;
    }
  }, [dragScrollSmoothing]);

  const onDragPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      const el = scrollRef.current;
      if (!el) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

      clearSmoothLoop();

      dragStartX.current = e.clientX;
      dragStartScrollLeft.current = el.scrollLeft;
      desiredScrollLeft.current = el.scrollLeft;
      pointerDown.current = true;
      dragMoved.current = false;
      el.style.cursor = "grabbing";
      el.style.userSelect = "none";

      const useSmooth = dragScrollSmoothing > 0;

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        const dx = ev.clientX - dragStartX.current;
        if (Math.abs(dx) > 3) dragMoved.current = true;
        const desired = dragStartScrollLeft.current - dx;
        desiredScrollLeft.current = desired;

        if (!useSmooth) {
          el.scrollLeft = desired;
          return;
        }
        if (rafId.current == null) {
          rafId.current = requestAnimationFrame(smoothLoop);
        }
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        pointerDown.current = false;
        clearSmoothLoop();
        el.scrollLeft = desiredScrollLeft.current;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        el.style.cursor = "";
        el.style.userSelect = "";
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [disabled, clearSmoothLoop, smoothLoop, dragScrollSmoothing]
  );

  /** Suppress accidental link/button activation after a drag gesture. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || disabled) return;
    const onClickCapture = (ev: MouseEvent) => {
      if (dragMoved.current) {
        ev.preventDefault();
        ev.stopPropagation();
        dragMoved.current = false;
      }
    };
    el.addEventListener("click", onClickCapture, true);
    return () => el.removeEventListener("click", onClickCapture, true);
  }, [disabled, ...deps]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || disabled || !verticalWheelScrollsHorizontal) return;
    const handleWheel = (wheelEvent: WheelEvent) => {
      wheelEvent.preventDefault();
      wheelEvent.stopPropagation();
      el.scrollLeft += wheelEvent.deltaY;
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [disabled, verticalWheelScrollsHorizontal, ...deps]);

  return { scrollRef, onDragPointerDown, dragMoved };
}
