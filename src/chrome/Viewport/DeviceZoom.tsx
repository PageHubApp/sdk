import React, { useEffect, useState } from "react";
import { TbMinus, TbPlus, TbZoomScan } from "react-icons/tb";
import { useAtomState, useAtomValue } from "@zedux/react";
import { DeviceDimensionsAtom, DeviceZoomAtom } from "./atoms";

const zoomPresets = [
  { label: "25%", value: 0.25 },
  { label: "33%", value: 0.33 },
  { label: "50%", value: 0.5 },
  { label: "67%", value: 0.67 },
  { label: "75%", value: 0.75 },
  { label: "80%", value: 0.8 },
  { label: "90%", value: 0.9 },
  { label: "100%", value: 1 },
  { label: "110%", value: 1.1 },
  { label: "125%", value: 1.25 },
  { label: "150%", value: 1.5 },
  { label: "175%", value: 1.75 },
  { label: "200%", value: 2 },
];

export function DeviceZoom() {
  const [zoom, setZoom] = useAtomState(DeviceZoomAtom);
  const deviceDimensions = useAtomValue(DeviceDimensionsAtom);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fitToWindow, setFitToWindow] = useState(false);

  const currentZoomLabel =
    zoomPresets.find(p => p.value === zoom)?.label || `${Math.round(zoom * 100)}%`;

  // Fit to window calculation
  useEffect(() => {
    if (!fitToWindow) return;

    const calculateFitZoom = () => {
      const viewportHeight = window.innerHeight;
      const availableHeight = viewportHeight - 350; // Account for header, padding, controls
      const deviceHeight = deviceDimensions.height;
      const calculatedZoom = availableHeight / deviceHeight;
      setZoom(Math.max(0.25, Math.min(2, calculatedZoom)));
    };

    calculateFitZoom();
    window.addEventListener("resize", calculateFitZoom);
    return () => window.removeEventListener("resize", calculateFitZoom);
  }, [fitToWindow, setZoom, deviceDimensions.height]);

  const handleZoomChange = (newZoom: number, isFitToWindow = false) => {
    setZoom(newZoom);
    setFitToWindow(isFitToWindow);
    setShowDropdown(false);
  };

  const handleZoomIn = () => {
    const currentIndex = zoomPresets.findIndex(p => p.value >= zoom);
    const nextIndex = Math.min(currentIndex + 1, zoomPresets.length - 1);
    handleZoomChange(zoomPresets[nextIndex].value);
  };

  const handleZoomOut = () => {
    const currentIndex = zoomPresets.findIndex(p => p.value >= zoom);
    const prevIndex = Math.max(currentIndex - 1, 0);
    handleZoomChange(zoomPresets[prevIndex].value);
  };

  // Keyboard shortcuts for zoom (Ctrl/Cmd + Plus/Minus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if device mode is active
      if (!document.querySelector('[data-device-zoom-active="true"]')) return;

      // Zoom in: Ctrl/Cmd + Plus or Ctrl/Cmd + =
      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        setZoom(currentZoom => {
          const currentIndex = zoomPresets.findIndex(p => p.value >= currentZoom);
          const nextIndex = Math.min(currentIndex + 1, zoomPresets.length - 1);
          setFitToWindow(false);
          return zoomPresets[nextIndex].value;
        });
      }
      // Zoom out: Ctrl/Cmd + Minus
      else if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        setZoom(currentZoom => {
          const currentIndex = zoomPresets.findIndex(p => p.value >= currentZoom);
          const prevIndex = Math.max(currentIndex - 1, 0);
          setFitToWindow(false);
          return zoomPresets[prevIndex].value;
        });
      }
      // Reset zoom: Ctrl/Cmd + 0
      else if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        setZoom(1);
        setFitToWindow(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setZoom]);

  return (
    <div
      className="text-neutral-content flex items-center gap-1 text-xs"
      data-device-zoom-active="true"
    >
      {/* Zoom Out Button */}
      <button
        onClick={handleZoomOut}
        disabled={zoom <= 0.25}
        className="hover:bg-neutral hover:text-base-content rounded p-1 transition-colors disabled:opacity-30"
        title="Zoom out (Ctrl/Cmd + -)"
      >
        <TbMinus className="size-3" />
      </button>

      {/* Zoom Percentage Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="hover:bg-neutral hover:text-base-content flex min-w-[50px] items-center justify-center gap-1 rounded px-2 py-1 transition-colors"
          title="Zoom level (Ctrl/Cmd + 0 to reset)"
        >
          <span className="whitespace-nowrap">{currentZoomLabel}</span>
          <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <>
            {/* Backdrop */}
            <div
              role="presentation"
              aria-hidden="true"
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            {/* Dropdown */}
            <div className="border-base-300 bg-base-100 absolute top-full left-0 z-50 mt-1 w-48 overflow-hidden rounded-lg border shadow-lg">
              <div className="scrollbar-dark max-h-80 overflow-y-auto">
                {zoomPresets.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => handleZoomChange(preset.value)}
                    className={`hover:bg-neutral w-full px-4 py-2 text-left transition-colors ${
                      zoom === preset.value && !fitToWindow
                        ? "bg-neutral text-base-content"
                        : "text-neutral-content"
                    }`}
                  >
                    {preset.label}
                    {preset.value === 1 && (
                      <span className="ml-1 text-xs opacity-60">(Default)</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="border-base-300 border-t">
                <button
                  onClick={() => {
                    setFitToWindow(true);
                    setShowDropdown(false);
                  }}
                  className={`hover:bg-neutral flex w-full items-center gap-2 px-4 py-2 text-left transition-colors ${
                    fitToWindow ? "bg-neutral text-base-content" : "text-neutral-content"
                  }`}
                >
                  <TbZoomScan className="size-4" />
                  <span>Fit to window</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Zoom In Button */}
      <button
        onClick={handleZoomIn}
        disabled={zoom >= 2}
        className="hover:bg-neutral hover:text-base-content rounded p-1 transition-colors disabled:opacity-30"
        title="Zoom in (Ctrl/Cmd + +)"
      >
        <TbPlus className="size-3" />
      </button>
    </div>
  );
}
