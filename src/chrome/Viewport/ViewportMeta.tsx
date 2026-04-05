// @ts-nocheck
import { useEffect } from "react";
import { useAtomValue } from "@zedux/react";
import { DeviceAtom, DeviceDimensionsAtom, ViewAtom } from "./atoms";

export const ViewportMeta = () => {
  const view = useAtomValue(ViewAtom);
  const device = useAtomValue(DeviceAtom);
  const deviceDimensions = useAtomValue(DeviceDimensionsAtom);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.querySelector(".pagehub-sdk-root");
    if (!root) return;

    const viewport = document.getElementById("viewport");

    if (view === "mobile") {
      root.classList.add("mobile-preview");
      root.classList.remove("desktop-preview");

      if (viewport) {
        viewport.setAttribute("data-pointer", "coarse");
      }
    } else {
      root.classList.add("desktop-preview");
      root.classList.remove("mobile-preview");

      if (viewport) {
        viewport.setAttribute("data-pointer", "fine");
      }
    }

    return () => {
      root.classList.remove("mobile-preview", "desktop-preview");
      if (viewport) {
        viewport.removeAttribute("data-pointer");
      }
    };
  }, [view]);

  // Inject CSS to override screen dimensions in device mode
  useEffect(() => {
    if (typeof window === "undefined") return;

    const styleId = "device-screen-override";
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (device && view === "mobile") {
      // Create or update style element
      if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }

      // Override screen dimensions and viewport units for the device
      const scopedViewport = ".pagehub-sdk-root #viewport";
      styleElement.textContent = `
        /* Override Tailwind screen utilities */
        ${scopedViewport} .h-screen,
        ${scopedViewport} .min-h-screen {
          height: ${deviceDimensions.height}px !important;
          min-height: ${deviceDimensions.height}px !important;
        }
        
        ${scopedViewport} .w-screen {
          width: ${deviceDimensions.width}px !important;
        }
        
        ${scopedViewport} .min-w-screen {
          min-width: ${deviceDimensions.width}px !important;
        }
        
        ${scopedViewport} .max-h-screen {
          max-height: ${deviceDimensions.height}px !important;
        }
        
        ${scopedViewport} .max-w-screen {
          max-width: ${deviceDimensions.width}px !important;
        }
        
        /* Override viewport units (vh, vw, vmin, vmax) */
        ${scopedViewport} {
          --viewport-height: ${deviceDimensions.height}px;
          --viewport-width: ${deviceDimensions.width}px;
          --vh: ${deviceDimensions.height / 100}px;
          --vw: ${deviceDimensions.width / 100}px;
          --vmin: ${Math.min(deviceDimensions.width, deviceDimensions.height) / 100}px;
          --vmax: ${Math.max(deviceDimensions.width, deviceDimensions.height) / 100}px;
        }
        
        /* Apply viewport units to common patterns */
        ${scopedViewport} [style*="100vh"],
        ${scopedViewport} [style*="height: 100vh"] {
          height: ${deviceDimensions.height}px !important;
        }
        
        ${scopedViewport} [style*="min-height: 100vh"] {
          min-height: ${deviceDimensions.height}px !important;
        }
        
        ${scopedViewport} [style*="100vw"],
        ${scopedViewport} [style*="width: 100vw"] {
          width: ${deviceDimensions.width}px !important;
        }
        
        /* Simulate touch device */
        ${scopedViewport} * {
          -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
          touch-action: manipulation;
        }
        
        /* Smooth scrolling like mobile */
        ${scopedViewport} {
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }
        
        /* Hide scrollbars like mobile (optional) */
        ${scopedViewport}::-webkit-scrollbar {
          display: none;
        }
        
        ${scopedViewport} {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        /* Safe area insets for notched devices (iPhone X+) */
        ${
          deviceDimensions.height >= 812
            ? `
          ${scopedViewport} {
            --safe-area-inset-top: 44px;
            --safe-area-inset-bottom: 34px;
            --safe-area-inset-left: 0px;
            --safe-area-inset-right: 0px;
          }
        `
            : `
          ${scopedViewport} {
            --safe-area-inset-top: 20px;
            --safe-area-inset-bottom: 0px;
            --safe-area-inset-left: 0px;
            --safe-area-inset-right: 0px;
          }
        `
        }
        
        /* Device Pixel Ratio (DPR) for Retina displays */
        ${scopedViewport} {
          --device-pixel-ratio: ${deviceDimensions.dpr || 2};
        }
        
        /* Simulate device resolution with image-rendering */
        ${
          (deviceDimensions.dpr || 2) >= 2
            ? `
          ${scopedViewport} img {
            image-rendering: -webkit-optimize-contrast;
            image-rendering: crisp-edges;
          }
        `
            : ""
        }
      `;
    } else {
      // Remove style element when not in device mode
      if (styleElement) {
        styleElement.remove();
      }
    }

    // Cleanup
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, [device, view, deviceDimensions]);

  return null; // This component doesn't render anything
};
