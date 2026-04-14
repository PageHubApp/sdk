import { SpacingOverlay } from "../../canvas/SpacingOverlay";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { useEffect, useRef, useState } from "react";

// Tailwind spacing scale in pixels (1 unit = 4px)
const TAILWIND_SPACING = [
  { value: 0, label: "0" },
  { value: 1, label: "px" },
  { value: 2, label: "0.5" },
  { value: 4, label: "1" },
  { value: 6, label: "1.5" },
  { value: 8, label: "2" },
  { value: 10, label: "2.5" },
  { value: 12, label: "3" },
  { value: 14, label: "3.5" },
  { value: 16, label: "4" },
  { value: 20, label: "5" },
  { value: 24, label: "6" },
  { value: 28, label: "7" },
  { value: 32, label: "8" },
  { value: 36, label: "9" },
  { value: 40, label: "10" },
  { value: 44, label: "11" },
  { value: 48, label: "12" },
  { value: 56, label: "14" },
  { value: 64, label: "16" },
  { value: 80, label: "20" },
  { value: 96, label: "24" },
  { value: 112, label: "28" },
  { value: 128, label: "32" },
  { value: 144, label: "36" },
  { value: 160, label: "40" },
  { value: 176, label: "44" },
  { value: 192, label: "48" },
  { value: 208, label: "52" },
  { value: 224, label: "56" },
  { value: 240, label: "60" },
  { value: 256, label: "64" },
  { value: 288, label: "72" },
  { value: 320, label: "80" },
  { value: 384, label: "96" },
];

// Snap pixel value to closest Tailwind spacing value (only if within range)
const snapToTailwindSpacing = (pixels: number): number => {
  const isNegative = pixels < 0;
  const absoluteValue = Math.abs(pixels);

  // Get max Tailwind value
  const maxTailwind = TAILWIND_SPACING[TAILWIND_SPACING.length - 1].value; // 384px

  // If beyond Tailwind's max range, don't snap - use arbitrary value
  if (absoluteValue > maxTailwind + 20) {
    // Allow 20px buffer beyond max
    return pixels; // Return as-is for arbitrary value
  }

  let closest = TAILWIND_SPACING[0];
  let minDiff = Math.abs(absoluteValue - closest.value);

  for (const spacing of TAILWIND_SPACING) {
    const diff = Math.abs(absoluteValue - spacing.value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = spacing;
    }
  }

  return isNegative ? -closest.value : closest.value;
};

function DragAdjust({
  targetElement,
  direction = "vertical",
  unit = "px",
  showButton = true,
  className = "",
  styleToUse = "marginTop",
  tooltip = "",
  snapToTailwind = true,
  isPadding = false,
  onChange = value => {},
  onDragStart = () => {},
  onDragEnd = () => {},
}) {
  // Determine if we need to reverse drag direction for padding
  // Right/Bottom padding should reverse (drag inward = increase)
  const shouldReverse =
    isPadding && (styleToUse === "paddingRight" || styleToUse === "paddingBottom");
  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [startX, setStartX] = useState(null);
  const [startY, setStartY] = useState(null);
  const [initialMarginTop, setInitialMarginTop] = useState(null);
  const [initialWidth, setInitialWidth] = useState(null);
  const targetRef = useRef(null);

  // Determine spacing type and position for overlay
  const spacingType = isPadding ? "padding" : "margin";
  const spacingPosition = styleToUse.includes("Top")
    ? "top"
    : styleToUse.includes("Bottom")
      ? "bottom"
      : styleToUse.includes("Left")
        ? "left"
        : styleToUse.includes("Right")
          ? "right"
          : "top";

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  });

  const handleMouseDown = e => {
    if (!targetElement) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    setStartX(e.clientX);
    setStartY(e.clientY);
    const computedStyle = window.getComputedStyle(targetElement);
    if (direction === "vertical") {
      setInitialMarginTop(parseFloat(computedStyle[styleToUse]) || 0);
    } else if (direction === "horizontal") {
      setInitialWidth(parseFloat(computedStyle[styleToUse]) || 0);
    }
    targetRef.current = targetElement;
    document.body.style.cursor = "move";
    if (onDragStart) onDragStart();
  };

  const handleMouseUp = () => {
    if (dragging && onDragEnd) {
      onDragEnd();
    }
    setDragging(false);
    document.body.style.cursor = "auto";
  };

  const handleMouseMove = e => {
    if (dragging && targetRef.current) {
      if (direction === "vertical") {
        let dragDistance = e.clientY - startY;
        // Reverse for bottom padding (drag up = increase)
        if (shouldReverse) dragDistance = -dragDistance;
        let newValue = initialMarginTop + dragDistance;

        // Apply Tailwind snapping if enabled
        if (snapToTailwind && unit === "px") {
          newValue = snapToTailwindSpacing(newValue);
        }

        // Only call onChange, don't set inline styles
        onChange(`${newValue}${unit}`);
      } else if (direction === "horizontal") {
        let dragDistance = e.clientX - startX;
        // Reverse for right padding (drag left = increase)
        if (shouldReverse) dragDistance = -dragDistance;
        let newValue = initialWidth + dragDistance;

        // Apply Tailwind snapping if enabled
        if (snapToTailwind && unit === "px") {
          newValue = snapToTailwindSpacing(newValue);
        }

        // Only call onChange, don't set inline styles
        onChange(`${newValue}${unit}`);
      }
    }
  };

  return (
    <>
      <SpacingOverlay
        targetElement={targetElement}
        type={spacingType}
        position={spacingPosition}
        isActive={hovering || dragging}
      />
      <button
        className={`drag-control group ${className} ${
          isPadding
            ? direction === "vertical"
              ? "h-[4px] w-5"
              : "h-5 w-[4px]"
            : direction === "vertical"
              ? "h-1 w-5"
              : "h-5 w-1"
        } pointer-events-auto`}
        style={{
          animation: "node-control-in 0.5s ease-out 0.5s both",
          willChange: "transform",
          backfaceVisibility: "hidden",
          WebkitFontSmoothing: "antialiased",
        }}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        aria-label="Drag to adjust"
        {...(tooltip
          ? {
              "data-tooltip-id": PAGEHUB_RTT_GLOBAL_ID,
              "data-tooltip-content": tooltip,
              "data-tooltip-place": "bottom",
              "data-tooltip-offset": 10,
            }
          : {})}
      />
    </>
  );
}

export default DragAdjust;
