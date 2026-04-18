import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent,
  type MouseEventHandler,
  type MutableRefObject,
  type RefObject,
} from "react";

export interface UseHorizontalDragScrollOptions {
  /** Re-register listeners when content changes (e.g. `items.length`). */
  deps?: readonly unknown[];
  /** Map vertical wheel to `scrollLeft` (theme reel / picker pattern). Default `true`. */
  verticalWheelScrollsHorizontal?: boolean;
}

export interface UseHorizontalDragScrollReturn {
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Attach to the `overflow-x-auto` scroller (primary mouse button). */
  onDragPointerDown: MouseEventHandler<HTMLDivElement>;
  /**
   * Set `true` once horizontal drag exceeds a small threshold.
   * Read in child `onClick` handlers to ignore accidental clicks after drag.
   */
  dragMoved: MutableRefObject<boolean>;
}

/**
 * Horizontal overflow: pointer-drag to scroll + optional vertical-wheel → scrollLeft.
 * Matches the interaction used by `ThemeReel` and token swatch strips.
 */
export function useHorizontalDragScroll(
  options: UseHorizontalDragScrollOptions = {}
): UseHorizontalDragScrollReturn {
  const { deps = [], verticalWheelScrollsHorizontal = true } = options;

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragActive = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScrollLeft = useRef(0);
  const dragMoved = useRef(false);

  const onDragPointerDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    if (e.button !== 0) return;
    dragActive.current = true;
    dragStartX.current = e.clientX;
    dragStartScrollLeft.current = el.scrollLeft;
    dragMoved.current = false;
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onMove = (e: globalThis.MouseEvent) => {
      if (!dragActive.current) return;
      const dx = e.clientX - dragStartX.current;
      if (Math.abs(dx) > 3) dragMoved.current = true;
      el.scrollLeft = dragStartScrollLeft.current - dx;
    };
    const onUp = () => {
      if (!dragActive.current) return;
      dragActive.current = false;
      el.style.cursor = "";
      el.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [...deps]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !verticalWheelScrollsHorizontal) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [verticalWheelScrollsHorizontal, ...deps]);

  return { scrollRef, onDragPointerDown, dragMoved };
}
