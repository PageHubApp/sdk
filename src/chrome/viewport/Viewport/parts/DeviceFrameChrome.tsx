import { TbX } from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { CanvasZoom } from "../../canvas/CanvasZoom";
import { DeviceSelector } from "../../canvas/DeviceSelector";
import { DeviceZoomAtom } from "../../state/atoms";

/**
 * Header bar that floats above the device-frame canvas. Phones get a
 * full DeviceSelector (model picker); tablets/laptops/monitors get a
 * minimal label + dimensions readout. Both include an exit button and
 * a CanvasZoom control.
 */
export function DeviceFrameChrome({
  deviceFrame,
  setDevice,
}: {
  deviceFrame: {
    kind: "phone" | "tablet" | "laptop" | "monitor";
    innerWidth: number;
    innerHeight: number;
    bezelX: number;
    bezelY: number;
  };
  setDevice: (next: boolean) => void;
}) {
  const isPhoneFrame = deviceFrame.kind === "phone";
  return (
    <div className="absolute top-4 right-0 left-0 z-50">
      <div className="bg-neutral/95 mx-auto flex w-fit items-center gap-4 rounded-xl px-4 py-2 shadow-lg backdrop-blur-sm">
        {isPhoneFrame ? (
          <DeviceSelector onClose={() => setDevice(false)} />
        ) : (
          <div className="text-neutral-content flex items-center gap-2 text-xs">
            <span className="font-medium capitalize">{deviceFrame.kind}</span>
            <span className="opacity-70">
              {deviceFrame.innerWidth} × {deviceFrame.innerHeight}
            </span>
            <button
              type="button"
              onClick={() => setDevice(false)}
              className="hover:text-base-content ml-2 transition-colors"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Exit device mode"
              aria-label="Exit device mode"
            >
              <TbX className="size-4" />
            </button>
          </div>
        )}
        <div className="bg-border h-4 w-px" />
        <CanvasZoom
          zoomAtom={DeviceZoomAtom}
          fitMode={{
            kind: "both",
            targetW: deviceFrame.innerWidth + deviceFrame.bezelX,
            targetH: deviceFrame.innerHeight + deviceFrame.bezelY,
            chromeOffsetW: 220,
            chromeOffsetH: 220,
            max: 1,
          }}
          activeKey="device"
          storageKey="editor-device-zoom"
        />
      </div>
    </div>
  );
}
