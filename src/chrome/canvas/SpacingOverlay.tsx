import { useEffect, useState } from "react";
import ReactDOM from "react-dom";

/**
 * SpacingOverlay - Visual feedback for margin/padding adjustments
 * Shows colored overlays like browser devtools
 */
export const SpacingOverlay = ({
  targetElement,
  type = "margin", // "margin" or "padding"
  position = "top", // "top" | "bottom" | "left" | "right" | "all"
  isActive = false,
}: {
  targetElement: HTMLElement | null;
  type?: "margin" | "padding";
  position?: "top" | "bottom" | "left" | "right" | "all";
  isActive?: boolean;
}) => {
  const [overlayData, setOverlayData] = useState<Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
  }> | null>(null);

  useEffect(() => {
    if (!targetElement || !isActive) {
      setOverlayData(null);
      return;
    }

    const updateOverlay = () => {
      const rect = targetElement.getBoundingClientRect();
      const styles = window.getComputedStyle(targetElement);

      const overlays = [];

      if (type === "margin") {
        const mt = parseFloat(styles.marginTop) || 0;
        const mr = parseFloat(styles.marginRight) || 0;
        const mb = parseFloat(styles.marginBottom) || 0;
        const ml = parseFloat(styles.marginLeft) || 0;

        if ((position === "top" || position === "all") && mt > 0) {
          overlays.push({
            x: rect.left,
            y: rect.top - mt,
            width: rect.width,
            height: mt,
            label: `${Math.round(mt)}px`,
          });
        }
        if ((position === "bottom" || position === "all") && mb > 0) {
          overlays.push({
            x: rect.left,
            y: rect.bottom,
            width: rect.width,
            height: mb,
            label: `${Math.round(mb)}px`,
          });
        }
        if ((position === "left" || position === "all") && ml > 0) {
          overlays.push({
            x: rect.left - ml,
            y: rect.top,
            width: ml,
            height: rect.height,
            label: `${Math.round(ml)}px`,
          });
        }
        if ((position === "right" || position === "all") && mr > 0) {
          overlays.push({
            x: rect.right,
            y: rect.top,
            width: mr,
            height: rect.height,
            label: `${Math.round(mr)}px`,
          });
        }
      } else if (type === "padding") {
        const pt = parseFloat(styles.paddingTop) || 0;
        const pr = parseFloat(styles.paddingRight) || 0;
        const pb = parseFloat(styles.paddingBottom) || 0;
        const pl = parseFloat(styles.paddingLeft) || 0;

        if ((position === "top" || position === "all") && pt > 0) {
          overlays.push({
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: pt,
            label: `${Math.round(pt)}px`,
          });
        }
        if ((position === "bottom" || position === "all") && pb > 0) {
          overlays.push({
            x: rect.left,
            y: rect.bottom - pb,
            width: rect.width,
            height: pb,
            label: `${Math.round(pb)}px`,
          });
        }
        if ((position === "left" || position === "all") && pl > 0) {
          overlays.push({
            x: rect.left,
            y: rect.top,
            width: pl,
            height: rect.height,
            label: `${Math.round(pl)}px`,
          });
        }
        if ((position === "right" || position === "all") && pr > 0) {
          overlays.push({
            x: rect.right - pr,
            y: rect.top,
            width: pr,
            height: rect.height,
            label: `${Math.round(pr)}px`,
          });
        }
      }

      setOverlayData(overlays);
    };

    updateOverlay();

    // Update on scroll/resize
    const rafId = setInterval(updateOverlay, 100);
    window.addEventListener("scroll", updateOverlay, true);
    window.addEventListener("resize", updateOverlay);

    return () => {
      clearInterval(rafId);
      window.removeEventListener("scroll", updateOverlay, true);
      window.removeEventListener("resize", updateOverlay);
    };
  }, [targetElement, type, position, isActive]);

  const container = document?.querySelector('[data-container="true"]');
  if (!container || !overlayData || overlayData.length === 0) return null;

  // Colors matching Chrome DevTools Box Model
  const color =
    type === "margin"
      ? "rgba(246, 178, 107, 0.4)" // Orange for margin (#F6B26B)
      : "rgba(147, 196, 125, 0.4)"; // Green for padding (#93C47D)

  const borderColor = type === "margin" ? "rgba(246, 178, 107, 0.7)" : "rgba(147, 196, 125, 0.7)";

  return ReactDOM.createPortal(
    <>
      {overlayData.map((overlay, i) => (
        <div
          key={`${type}-overlay-${i}`}
          style={{
            animation: "node-control-in 0.15s ease-out both",
            position: "fixed",
            left: overlay.x,
            top: overlay.y,
            width: overlay.width,
            height: overlay.height,
            backgroundColor: color,
            border: `1px dashed ${borderColor}`,
            pointerEvents: "none",
            zIndex: 9998, // Below controls (9999) but above content
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: type === "margin" ? "#b45309" : "#15803d",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              padding: "2px 6px",
              borderRadius: "3px",
              border: `1px solid ${borderColor}`,
              fontFamily: "system-ui, -apple-system, sans-serif",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {overlay.label}
          </span>
        </div>
      ))}
    </>,
    container
  );
};
