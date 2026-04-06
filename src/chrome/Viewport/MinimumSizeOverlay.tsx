import React, { useEffect, useState } from "react";
import { TbArrowsDiagonal, TbArrowsMaximize, TbArrowsMove, TbDeviceDesktop } from "react-icons/tb";

const MIN_WIDTH = 540;
const MIN_HEIGHT = 480;

export function MinimumSizeOverlay() {
  const [isTooSmall, setIsTooSmall] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsTooSmall(width < MIN_WIDTH || height < MIN_HEIGHT);
    };

    // Check on mount
    checkSize();

    // Listen for resize events
    window.addEventListener("resize", checkSize);

    return () => {
      window.removeEventListener("resize", checkSize);
    };
  }, []);

  if (!isTooSmall) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center"
      style={{
        backdropFilter: "blur(12px)",
        background: "rgba(0, 0, 0, 0.85)",
      }}
    >
      {/* Corner resize indicators */}
      <div className="absolute left-4 top-4 animate-pulse text-primary">
        <TbArrowsDiagonal className="size-8" />
      </div>
      <div className="absolute right-4 top-4 animate-pulse text-primary">
        <TbArrowsDiagonal className="size-8 -scale-x-100" />
      </div>
      <div className="absolute bottom-4 left-4 animate-pulse text-primary">
        <TbArrowsDiagonal className="size-8 -scale-y-100" />
      </div>
      <div className="absolute bottom-4 right-4 animate-pulse text-primary">
        <TbArrowsDiagonal className="size-8 -scale-100" />
      </div>

      {/* Side resize indicators */}
      <div className="absolute left-1/2 top-4 -translate-x-1/2 animate-pulse text-primary">
        <TbArrowsMove className="size-6" />
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-pulse text-primary">
        <TbArrowsMove className="size-6" />
      </div>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 animate-pulse text-primary">
        <TbArrowsMove className="size-6 rotate-90" />
      </div>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-pulse text-primary">
        <TbArrowsMove className="size-6 rotate-90" />
      </div>

      {/* Main content */}
      <div className="relative flex max-w-md flex-col items-center gap-6 rounded-2xl bg-background/95 p-12 text-center shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-center rounded-full bg-primary/10 p-6">
          <TbDeviceDesktop className="size-16 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Viewport Too Small</h2>
          <p className="text-lg text-muted-foreground">
            The PageHub editor requires a minimum viewport size for optimal editing experience.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-muted px-6 py-3">
          <TbArrowsMaximize className="size-5 text-primary" />
          <div className="text-left">
            <div className="toolbar-label font-medium">Minimum Size Required</div>
            <div className="text-xs text-muted-foreground">
              {MIN_WIDTH}px × {MIN_HEIGHT}px
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>Drag window corners or edges to resize</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="text-xs text-muted-foreground">
          Current: {window.innerWidth}px × {window.innerHeight}px
        </div>
      </div>
    </div>
  );
}
