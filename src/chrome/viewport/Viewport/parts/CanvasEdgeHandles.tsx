import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";

/**
 * Drag handles on the left/right edges of the breakpoint canvas. Single
 * left/right pair shown only when a real breakpoint is active and the
 * editor is enabled. Drag is wired by `useCanvasEdgeResize`.
 */
export function CanvasEdgeHandles({
  breakpointWidthPx,
  handlePointerDownEdge,
  resetBreakpointWidth,
}: {
  breakpointWidthPx: number | null;
  handlePointerDownEdge: (side: "left" | "right") => (e: React.PointerEvent) => void;
  resetBreakpointWidth: () => void;
}) {
  return (
    <>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize canvas (drag) — double-click to reset"
        onPointerDown={handlePointerDownEdge("left")}
        onDoubleClick={resetBreakpointWidth}
        data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
        data-tooltip-content={`${breakpointWidthPx}px — drag to resize, double-click to reset`}
        data-tooltip-place="right"
        className="group absolute top-0 left-0 z-40 flex h-full w-5 -translate-x-full cursor-ew-resize items-center justify-center select-none"
      >
        <div className="bg-base-content/30 group-hover:bg-base-content/60 h-10 w-1 rounded-full transition-colors" />
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize canvas (drag) — double-click to reset"
        onPointerDown={handlePointerDownEdge("right")}
        onDoubleClick={resetBreakpointWidth}
        data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
        data-tooltip-content={`${breakpointWidthPx}px — drag to resize, double-click to reset`}
        data-tooltip-place="left"
        className="group absolute top-0 right-0 z-40 flex h-full w-5 translate-x-full cursor-ew-resize items-center justify-center select-none"
      >
        <div className="bg-base-content/30 group-hover:bg-base-content/60 h-10 w-1 rounded-full transition-colors" />
      </div>
    </>
  );
}
