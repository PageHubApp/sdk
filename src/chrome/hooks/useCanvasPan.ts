import { useAtomState } from "@zedux/react";
import React from "react";

interface UseCanvasPanOpts {
  panAtom: any;
  zoomAtom: any;
  containerRef: React.RefObject<HTMLElement | null>;
  enabled?: boolean;
}

interface UseCanvasPanResult {
  isPanning: boolean;
  cursor: string;
}

/**
 * Spacebar+drag (or middle-click drag) to pan, ctrl/cmd+wheel to zoom,
 * plain wheel to pan. Designed for the Components canvas surface.
 */
export function useCanvasPan({
  panAtom,
  zoomAtom,
  containerRef,
  enabled = true,
}: UseCanvasPanOpts): UseCanvasPanResult {
  const [, setPan] = useAtomState(panAtom);
  const [, setZoom] = useAtomState(zoomAtom);
  const [spaceDown, setSpaceDown] = React.useState(false);
  const [isPanning, setIsPanning] = React.useState(false);
  const dragRef = React.useRef<{ x: number; y: number } | null>(null);

  // Track Space key globally — we don't want it eaten by inputs unless focus is in one.
  React.useEffect(() => {
    if (!enabled) return;
    const isTypingTarget = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTypingTarget(e.target)) {
        if (!spaceDown) setSpaceDown(true);
        // Prevent page scroll when space is held over the canvas
        if (containerRef.current?.contains(e.target as Node)) {
          e.preventDefault();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    const onBlur = () => setSpaceDown(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [enabled, spaceDown, containerRef]);

  // Pointer drag for pan
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    // rAF coalescer: pointermove + wheel can fire 1000Hz on high-DPI mice; cap
    // atom writes at one per frame by accumulating pan delta + zoom factor in
    // refs and flushing on the next animation frame.
    let rafId = 0;
    const pendingPanDelta = { x: 0, y: 0 };
    let pendingZoomFactor = 1;
    const flush = () => {
      rafId = 0;
      const dx = pendingPanDelta.x;
      const dy = pendingPanDelta.y;
      const zf = pendingZoomFactor;
      pendingPanDelta.x = 0;
      pendingPanDelta.y = 0;
      pendingZoomFactor = 1;
      if (dx !== 0 || dy !== 0) {
        setPan((p: { x: number; y: number }) => ({ x: p.x + dx, y: p.y + dy }));
      }
      if (zf !== 1) {
        setZoom((z: number) => {
          const next = z * zf;
          return Math.max(0.25, Math.min(2, next));
        });
      }
    };
    const schedule = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(flush);
    };

    const onPointerDown = (e: PointerEvent) => {
      const middle = e.button === 1;
      if (!spaceDown && !middle) return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      dragRef.current = { x: e.clientX, y: e.clientY };
      setIsPanning(true);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      dragRef.current = { x: e.clientX, y: e.clientY };
      pendingPanDelta.x += dx;
      pendingPanDelta.y += dy;
      schedule();
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!dragRef.current) return;
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      dragRef.current = null;
      setIsPanning(false);
      // Flush any tail delta synchronously so the final position commits
      if (rafId) {
        cancelAnimationFrame(rafId);
        flush();
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        pendingZoomFactor *= 1 - e.deltaY * 0.005;
      } else {
        e.preventDefault();
        pendingPanDelta.x -= e.deltaX;
        pendingPanDelta.y -= e.deltaY;
      }
      schedule();
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [enabled, spaceDown, containerRef, setPan, setZoom]);

  const cursor = isPanning ? "grabbing" : spaceDown ? "grab" : "default";
  return { isPanning, cursor };
}
