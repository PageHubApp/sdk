/**
 * Cosmetic accents on top/bottom of device frames — phone notch, monitor
 * stand, laptop chin, etc. Render INSIDE the canvas (absolute), so they
 * sit relative to the frame's bezel.
 */
export function DeviceFrameTopDecoration({
  decoration,
}: {
  decoration: "notch" | "camera-top" | "camera-side" | "laptop-chin" | "monitor-stand" | undefined;
}) {
  if (decoration === "notch") {
    return (
      <div className="pointer-events-none absolute top-[14px] right-0 left-0 z-60 flex justify-center">
        <div className="h-[30px] w-[105px] rounded-full bg-[#0a0a0a]" />
      </div>
    );
  }
  if (decoration === "camera-top") {
    return (
      <div className="pointer-events-none absolute top-[6px] right-0 left-0 z-60 flex justify-center">
        <div className="size-1.5 rounded-full bg-[#0a0a0a]" />
      </div>
    );
  }
  if (decoration === "camera-side") {
    return (
      <div className="pointer-events-none absolute top-0 bottom-0 left-[6px] z-60 flex items-center">
        <div className="size-1.5 rounded-full bg-[#0a0a0a]" />
      </div>
    );
  }
  return null;
}

export function DeviceFrameBottomDecoration({
  decoration,
}: {
  decoration: "notch" | "camera-top" | "camera-side" | "laptop-chin" | "monitor-stand" | undefined;
}) {
  if (decoration === "notch") {
    return (
      <div className="pointer-events-none absolute right-0 bottom-[14px] left-0 z-60 flex justify-center">
        <div className="bg-foreground/30 h-[5px] w-[120px] rounded-full" />
      </div>
    );
  }
  if (decoration === "laptop-chin") {
    return (
      <div className="pointer-events-none absolute right-0 bottom-[8px] left-0 z-60 flex justify-center">
        <div className="h-[3px] w-[120px] rounded-full bg-[#3a3a3a]" />
      </div>
    );
  }
  if (decoration === "monitor-stand") {
    return (
      <div className="pointer-events-none absolute right-0 bottom-[10px] left-0 z-60 flex justify-center">
        <div className="h-[2px] w-[180px] rounded-full bg-[#3a3a3a]" />
      </div>
    );
  }
  return null;
}
