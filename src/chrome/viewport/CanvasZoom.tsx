import React, { useEffect, useState } from "react";
import { TbMinus, TbPlus, TbZoomScan } from "react-icons/tb";
import { useAtomState } from "@zedux/react";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";

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

type FitMode =
  | { kind: "height"; target: number; chromeOffset?: number; max?: number }
  | { kind: "width"; target: number; chromeOffset?: number; max?: number };

interface CanvasZoomProps {
  // Zedux atom whose value is a number. Accepts any number atom template
  // without needing zedux internal generics.
  zoomAtom: any;
  fitMode: FitMode;
  /** Unique key used to scope Ctrl/Cmd +/−/0 shortcuts to this instance. */
  activeKey: string;
  /** When true, controls are inert but still occupy their normal space. */
  disabled?: boolean;
}

export function CanvasZoom({ zoomAtom, fitMode, activeKey, disabled = false }: CanvasZoomProps) {
  const [zoom, setZoom] = useAtomState(zoomAtom);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fitToWindow, setFitToWindow] = useState(false);

  const activeAttr = `data-canvas-zoom-${activeKey}`;
  const activeSelector = `[${activeAttr}="true"]`;

  const currentZoomLabel =
    zoomPresets.find(p => p.value === zoom)?.label || `${Math.round(zoom * 100)}%`;

  useEffect(() => {
    if (!fitToWindow) return;

    const calculateFitZoom = () => {
      const max = fitMode.max ?? 2;
      const available =
        fitMode.kind === "height"
          ? window.innerHeight - (fitMode.chromeOffset ?? 350)
          : window.innerWidth - (fitMode.chromeOffset ?? 80);
      const calculated = available / fitMode.target;
      setZoom(Math.max(0.25, Math.min(max, calculated)));
    };

    calculateFitZoom();
    window.addEventListener("resize", calculateFitZoom);
    return () => window.removeEventListener("resize", calculateFitZoom);
  }, [fitToWindow, setZoom, fitMode.kind, fitMode.target, fitMode.chromeOffset, fitMode.max]);

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

  useEffect(() => {
    if (disabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!document.querySelector(activeSelector)) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        setZoom((currentZoom: number) => {
          const currentIndex = zoomPresets.findIndex(p => p.value >= currentZoom);
          const nextIndex = Math.min(currentIndex + 1, zoomPresets.length - 1);
          setFitToWindow(false);
          return zoomPresets[nextIndex].value;
        });
      } else if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        setZoom((currentZoom: number) => {
          const currentIndex = zoomPresets.findIndex(p => p.value >= currentZoom);
          const prevIndex = Math.max(currentIndex - 1, 0);
          setFitToWindow(false);
          return zoomPresets[prevIndex].value;
        });
      } else if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        setZoom(1);
        setFitToWindow(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setZoom, activeSelector, disabled]);

  return (
    <div
      className="text-neutral-content flex items-center gap-1 text-xs"
      {...{ [activeAttr]: "true" }}
    >
      <button
        onClick={handleZoomOut}
        disabled={disabled || zoom <= 0.25}
        className="hover:bg-neutral hover:text-base-content rounded p-1 transition-colors disabled:opacity-30"
        data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
        data-tooltip-content="Zoom out (Ctrl/Cmd + -)"
        data-tooltip-place="bottom"
        data-tooltip-offset={10}
      >
        <TbMinus className="size-3" />
      </button>

      <div className="relative">
        <button
          onClick={() => !disabled && setShowDropdown(!showDropdown)}
          disabled={disabled}
          className="hover:bg-neutral hover:text-base-content flex min-w-[50px] items-center justify-center gap-1 rounded px-2 py-1 transition-colors disabled:opacity-30"
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Zoom level (Ctrl/Cmd + 0 to reset)"
          data-tooltip-place="bottom"
          data-tooltip-offset={10}
        >
          <span className="whitespace-nowrap">{currentZoomLabel}</span>
          <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDropdown && (
          <>
            <div
              role="presentation"
              aria-hidden="true"
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
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

      <button
        onClick={handleZoomIn}
        disabled={disabled || zoom >= 2}
        className="hover:bg-neutral hover:text-base-content rounded p-1 transition-colors disabled:opacity-30"
        data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
        data-tooltip-content="Zoom in (Ctrl/Cmd + +)"
        data-tooltip-place="bottom"
        data-tooltip-offset={10}
      >
        <TbPlus className="size-3" />
      </button>
    </div>
  );
}
