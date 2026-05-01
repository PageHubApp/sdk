import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { breakpointMarkerOrder, type BpKey } from "../constants";

/**
 * Per-breakpoint vertical markers (sm/md/lg/xl/2xl) overlaid on the canvas.
 * Drag to live-preview a new px value (dashed indigo line); release to commit.
 * Custom (theme-overridden) breakpoints render with a stronger dashed line.
 */
export function BreakpointMarkers({
  themeBreakpoints,
  pendingBreakpointOverride,
  getEffectiveBpPx,
  handleMarkerPointerDown,
  resetMarkerBreakpoint,
}: {
  themeBreakpoints: Record<string, number> | undefined;
  pendingBreakpointOverride: Record<string, number>;
  getEffectiveBpPx: (bp: BpKey) => number;
  handleMarkerPointerDown: (bp: BpKey) => (e: React.PointerEvent) => void;
  resetMarkerBreakpoint: (bp: BpKey) => () => void;
}) {
  return (
    <>
      {breakpointMarkerOrder.map(bp => {
        const px = getEffectiveBpPx(bp);
        const isPending = pendingBreakpointOverride[bp] !== undefined;
        const isCustom = themeBreakpoints?.[bp] !== undefined;
        return (
          <div
            key={bp}
            role="separator"
            aria-orientation="vertical"
            aria-label={`Breakpoint ${bp.toUpperCase()} at ${px}px — drag to adjust, double-click to reset`}
            onPointerDown={handleMarkerPointerDown(bp)}
            onDoubleClick={resetMarkerBreakpoint(bp)}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content={`${bp.toUpperCase()} · ${px}px — drag to adjust${isCustom ? ", double-click to reset" : ""}`}
            data-tooltip-place="right"
            className="group absolute top-0 bottom-0 z-30 w-3 -translate-x-1/2 cursor-ew-resize select-none"
            style={{ left: `${px}px` }}
          >
            <div
              className="pointer-events-none absolute inset-y-0 left-1/2"
              style={{
                borderLeft: isPending
                  ? "1px dashed rgba(99,102,241,0.9)"
                  : isCustom
                    ? "1px dashed rgba(99,102,241,0.6)"
                    : "1px dashed rgba(120,120,120,0.45)",
              }}
            />
            <span
              className={`bg-base-200 pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 rounded px-1 font-mono text-[10px] leading-none whitespace-nowrap ${
                isPending || isCustom
                  ? "text-primary"
                  : "text-base-content/70 group-hover:text-base-content"
              }`}
            >
              {bp.toUpperCase()} · {px}
            </span>
          </div>
        );
      })}
    </>
  );
}
