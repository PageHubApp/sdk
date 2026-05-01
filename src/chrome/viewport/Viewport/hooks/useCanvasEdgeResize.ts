import { useCallback } from "react";

interface UseCanvasEdgeResizeArgs {
  breakpointActive: boolean;
  breakpointWidthPx: number | null;
  canvasZoomActive: boolean;
  breakpointZoom: number;
  view: string;
  setBreakpointWidthOverride: (
    next: (prev: Record<string, number>) => Record<string, number>
  ) => void;
}

/**
 * Drag handles on the left/right canvas edges resize the breakpoint canvas
 * (drag is symmetric — each side moves half the cursor delta because the
 * canvas is `mx-auto` centered). Window-listener pattern per
 * `.claude/rules/drag-listeners.md`.
 *
 * `resetBreakpointWidth` clears the per-view override on double-click.
 */
export function useCanvasEdgeResize({
  breakpointActive,
  breakpointWidthPx,
  canvasZoomActive,
  breakpointZoom,
  view,
  setBreakpointWidthOverride,
}: UseCanvasEdgeResizeArgs) {
  const handlePointerDownEdge = useCallback(
    (side: "left" | "right") => (e: React.PointerEvent) => {
      if (!breakpointActive || !breakpointWidthPx) return;
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = breakpointWidthPx;
      const z = canvasZoomActive && breakpointZoom !== 1 ? breakpointZoom : 1;
      const minW = 240;
      const maxW = 3840;
      const onMove = (ev: PointerEvent) => {
        const dxScreen = ev.clientX - startX;
        const delta = (side === "right" ? dxScreen : -dxScreen) * 2;
        const next = Math.max(minW, Math.min(maxW, Math.round(startWidth + delta / z)));
        setBreakpointWidthOverride(prev => ({ ...prev, [view]: next }));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        window.removeEventListener("blur", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      window.addEventListener("blur", onUp);
    },
    [
      breakpointActive,
      breakpointWidthPx,
      breakpointZoom,
      canvasZoomActive,
      setBreakpointWidthOverride,
      view,
    ]
  );

  const resetBreakpointWidth = useCallback(() => {
    if (!breakpointActive) return;
    setBreakpointWidthOverride(prev => {
      if (!(view in prev)) return prev;
      const { [view]: _drop, ...rest } = prev;
      return rest;
    });
  }, [breakpointActive, setBreakpointWidthOverride, view]);

  return { handlePointerDownEdge, resetBreakpointWidth };
}
