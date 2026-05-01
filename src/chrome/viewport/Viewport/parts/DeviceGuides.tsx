import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { DEVICE_GUIDES } from "../constants";

/**
 * Informational vertical guides for common device widths (iPhone SE, iPad,
 * MacBook, etc.). Non-draggable, dotted. Toggled by `ShowDeviceGuidesAtom`.
 */
export function DeviceGuides() {
  return (
    <>
      {DEVICE_GUIDES.map(g => (
        <div
          key={g.id}
          role="presentation"
          aria-hidden="true"
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content={`${g.label} · ${g.width}px (reference guide)`}
          data-tooltip-place="right"
          className="pointer-events-auto absolute top-0 bottom-0 z-20 w-3 -translate-x-1/2 select-none"
          style={{ left: `${g.width}px` }}
        >
          <div
            className="pointer-events-none absolute inset-y-0 left-1/2"
            style={{ borderLeft: "1px dotted rgba(120,120,120,0.35)" }}
          />
          <span className="bg-base-200 text-base-content/60 pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 rounded px-1 font-mono text-[10px] leading-none whitespace-nowrap">
            {g.label} · {g.width}
          </span>
        </div>
      ))}
    </>
  );
}
