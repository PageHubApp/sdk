// @ts-nocheck
import { useEditor, useNode } from "@craftjs/core";
import { Tooltip } from "components/layout/Tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useAtomValue } from "@zedux/react";
import { twMerge } from "tailwind-merge";
import { buildVariantPrefix, editorCanvasViewToClassPrefixKey } from "../../utils/tailwind/className";
import { ViewSelectionAtom } from "../Toolbar/Label";
import { ViewAtom } from "../Viewport/atoms";
import { useElementColor } from "./lib";

const GAP_DETECTION_THRESHOLD = 40; // pixels - circular radius around gap control to trigger

// Convert pixel value to Tailwind gap class - snap to valid Tailwind values
const pixelsToGapClass = (pixels: number): string => {
  // Tailwind gap scale in pixels (1 unit = 4px)
  const tailwindGaps = [
    { class: "gap-0", px: 0 },
    { class: "gap-px", px: 1 },
    { class: "gap-0.5", px: 2 },
    { class: "gap-1", px: 4 },
    { class: "gap-1.5", px: 6 },
    { class: "gap-2", px: 8 },
    { class: "gap-2.5", px: 10 },
    { class: "gap-3", px: 12 },
    { class: "gap-3.5", px: 14 },
    { class: "gap-4", px: 16 },
    { class: "gap-5", px: 20 },
    { class: "gap-6", px: 24 },
    { class: "gap-7", px: 28 },
    { class: "gap-8", px: 32 },
    { class: "gap-9", px: 36 },
    { class: "gap-10", px: 40 },
    { class: "gap-11", px: 44 },
    { class: "gap-12", px: 48 },
    { class: "gap-14", px: 56 },
    { class: "gap-16", px: 64 },
    { class: "gap-20", px: 80 },
    { class: "gap-24", px: 96 },
    { class: "gap-28", px: 112 },
    { class: "gap-32", px: 128 },
    { class: "gap-36", px: 144 },
    { class: "gap-40", px: 160 },
    { class: "gap-44", px: 176 },
    { class: "gap-48", px: 192 },
    { class: "gap-52", px: 208 },
    { class: "gap-56", px: 224 },
    { class: "gap-60", px: 240 },
    { class: "gap-64", px: 256 },
    { class: "gap-72", px: 288 },
    { class: "gap-80", px: 320 },
    { class: "gap-96", px: 384 },
  ];

  // Find the closest Tailwind gap value
  let closest = tailwindGaps[0];
  let minDiff = Math.abs(pixels - closest.px);

  for (const gap of tailwindGaps) {
    const diff = Math.abs(pixels - gap.px);
    if (diff < minDiff) {
      minDiff = diff;
      closest = gap;
    }
  }

  return closest.class;
};

export const GapDragControl = () => {
  const { id, dom } = useNode(node => ({
    dom: node.dom,
  }));

  const { isSelected } = useEditor((_, query) => ({
    isSelected: query.getEvent("selected").contains(id),
  }));

  const {
    actions: { setProp },
  } = useNode();
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const classPrefixView = editorCanvasViewToClassPrefixKey(view);

  // Get the current computed color from the DOM (same as border-current uses)
  const elementColor = useElementColor(dom as HTMLElement, isSelected);

  const [gapHoverInfo, setGapHoverInfo] = useState<{
    show: boolean;
    x: number;
    y: number;
    direction: "horizontal" | "vertical";
    currentGap: number;
    childIndex: number; // Track which gap (between child i and i+1)
    gapRect?: { x: number; y: number; width: number; height: number }; // Full gap area for visualization
  } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{
    x: number;
    y: number;
    initialGap: number;
    childIndex: number;
  } | null>(null);

  // Use refs to avoid stale closures in event handlers
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef(dragStartPos);
  const gapHoverInfoRef = useRef(gapHoverInfo);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update refs when state changes
  isDraggingRef.current = isDragging;
  dragStartPosRef.current = dragStartPos;
  gapHoverInfoRef.current = gapHoverInfo;

  useEffect(() => {
    if (!dom || !isSelected) return;

    // Check if the element actually has flex display
    const styles = window.getComputedStyle(dom);
    const hasFlex = styles.display === "flex" || styles.display === "inline-flex";

    if (!hasFlex) return;

    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);

      // Handle dragging - lock to the specific gap we started dragging
      if (isDraggingRef.current && dragStartPosRef.current && gapHoverInfoRef.current) {
        const distance =
          gapHoverInfoRef.current.direction === "vertical"
            ? e.clientX - dragStartPosRef.current.x
            : e.clientY - dragStartPosRef.current.y;

        const newGapPx = Math.max(0, dragStartPosRef.current.initialGap + distance);

        document.body.style.cursor = "move";

        // Convert to Tailwind class and snap to valid values
        const gapClass = pixelsToGapClass(newGapPx);

        // Apply the snapped gap value to DOM for visual feedback
        const tailwindGapToPx = {
          "gap-0": 0,
          "gap-px": 1,
          "gap-0.5": 2,
          "gap-1": 4,
          "gap-1.5": 6,
          "gap-2": 8,
          "gap-2.5": 10,
          "gap-3": 12,
          "gap-3.5": 14,
          "gap-4": 16,
          "gap-5": 20,
          "gap-6": 24,
          "gap-7": 28,
          "gap-8": 32,
          "gap-9": 36,
          "gap-10": 40,
          "gap-11": 44,
          "gap-12": 48,
          "gap-14": 56,
          "gap-16": 64,
          "gap-20": 80,
          "gap-24": 96,
          "gap-28": 112,
          "gap-32": 128,
          "gap-36": 144,
          "gap-40": 160,
          "gap-44": 176,
          "gap-48": 192,
          "gap-52": 208,
          "gap-56": 224,
          "gap-60": 240,
          "gap-64": 256,
          "gap-72": 288,
          "gap-80": 320,
          "gap-96": 384,
        };
        const snappedPx = tailwindGapToPx[gapClass] || newGapPx;

        const prefix = buildVariantPrefix(classPrefixView, classDark);
        setProp(prop => {
          prop.className = twMerge(prop.className || "", prefix + gapClass);
        }, 300);

        // Update the control position to follow the gap center - use locked childIndex
        const children = Array.from(dom.children).filter(child => {
          const el = child as HTMLElement;
          // Skip node controls (they have data-node-control attribute)
          if (el.hasAttribute && el.hasAttribute("data-node-control")) return false;
          // Skip elements that should be excluded from gap detection
          if (el.hasAttribute && el.hasAttribute("data-exclude-gap-detection")) return false;
          return el.offsetParent !== null || el.tagName === "BODY";
        }) as HTMLElement[];

        // Use the locked child index from when we started dragging
        const lockedIndex = dragStartPosRef.current.childIndex;
        if (children.length > lockedIndex + 1) {
          const styles = window.getComputedStyle(dom);
          const flexDirection = styles.flexDirection;
          const child1 = children[lockedIndex].getBoundingClientRect();
          const child2 = children[lockedIndex + 1].getBoundingClientRect();

          let newX = gapHoverInfoRef.current.x;
          let newY = gapHoverInfoRef.current.y;
          let newGapRect;

          if (gapHoverInfoRef.current.direction === "vertical") {
            // For row gaps (vertical control), update X position
            const isReverse = flexDirection === "row-reverse";
            const leftChild = isReverse ? child2 : child1;
            const rightChild = isReverse ? child1 : child2;
            const gapStart = leftChild.right;
            const gapEnd = rightChild.left;
            newX = (gapStart + gapEnd) / 2;

            // Update gap rect for visual feedback
            newGapRect = {
              x: leftChild.right,
              y: child1.top < child2.top ? child1.top : child2.top,
              width: Math.max(1, rightChild.left - leftChild.right),
              height:
                (child1.bottom > child2.bottom ? child1.bottom : child2.bottom) -
                (child1.top < child2.top ? child1.top : child2.top),
            };
          } else {
            // For column gaps (horizontal control), update Y position
            const isReverse = flexDirection === "column-reverse";
            const topChild = isReverse ? child2 : child1;
            const bottomChild = isReverse ? child1 : child2;
            const gapStart = topChild.bottom;
            const gapEnd = bottomChild.top;
            newY = (gapStart + gapEnd) / 2;

            // Update gap rect for visual feedback
            newGapRect = {
              x: child1.left < child2.left ? child1.left : child2.left,
              y: topChild.bottom,
              width:
                (child1.right > child2.right ? child1.right : child2.right) -
                (child1.left < child2.left ? child1.left : child2.left),
              height: Math.max(1, bottomChild.top - topChild.bottom),
            };
          }

          setGapHoverInfo({
            ...gapHoverInfo,
            x: newX,
            y: newY,
            currentGap: snappedPx,
            gapRect: newGapRect,
          });
        }

        return;
      }

      // Don't update hover detection while dragging
      if (isDraggingRef.current) return;

      rafId = requestAnimationFrame(() => {
        const rect = dom.getBoundingClientRect();
        // Filter out non-visible children (like portals, scripts, etc) and node controls
        const children = Array.from(dom.children).filter(child => {
          const el = child as HTMLElement;
          // Skip node controls (they have data-node-control attribute)
          if (el.hasAttribute && el.hasAttribute("data-node-control")) return false;
          // Skip elements that should be excluded from gap detection
          if (el.hasAttribute && el.hasAttribute("data-exclude-gap-detection")) return false;
          return el.offsetParent !== null || el.tagName === "BODY";
        }) as HTMLElement[];

        if (children.length < 2) {
          setGapHoverInfo(null);
          return;
        }

        // Get computed styles to check flex direction
        const styles = window.getComputedStyle(dom);
        const flexDirection = styles.flexDirection;
        const isRow = flexDirection === "row" || flexDirection === "row-reverse";
        const isColumn = flexDirection === "column" || flexDirection === "column-reverse";

        // Parse current gap value - handle both gap and gap-x/gap-y
        let currentGapPx = 0;
        const gapValue = styles.gap;
        if (gapValue && gapValue !== "normal" && gapValue !== "0px") {
          const parsed = parseFloat(gapValue);
          if (!isNaN(parsed)) {
            currentGapPx = parsed;
          }
        }

        // Only show gap controls if there's an actual gap set (or very close to one)
        // This prevents showing controls for natural spacing between elements
        if (currentGapPx < 1 && styles.gap !== "0px") {
          setGapHoverInfo(null);
          return;
        }

        // Check if mouse is hovering in gap areas between children
        for (let i = 0; i < children.length - 1; i++) {
          const child1 = children[i].getBoundingClientRect();
          const child2 = children[i + 1].getBoundingClientRect();

          if (isRow) {
            // Horizontal gaps (between columns)
            // Handle both normal and reverse direction
            const isReverse = flexDirection === "row-reverse";
            const leftChild = isReverse ? child2 : child1;
            const rightChild = isReverse ? child1 : child2;

            const gapStart = leftChild.right;
            const gapEnd = rightChild.left;
            const gapCenter = (gapStart + gapEnd) / 2;
            const gapSize = Math.abs(gapEnd - gapStart);

            // Skip if this gap is way off from the expected gap value (natural spacing, not flex gap)
            // Allow some tolerance (±50%) for browser rounding
            const gapTolerance = Math.max(20, currentGapPx * 0.5);
            if (Math.abs(gapSize - currentGapPx) > gapTolerance) {
              continue;
            }

            // Get the vertical bounds of the two children that form this gap
            const minTop = Math.min(child1.top, child2.top);
            const maxBottom = Math.max(child1.bottom, child2.bottom);

            // Calculate where the control would be positioned
            const controlX = gapCenter;
            const controlY = (minTop + maxBottom) / 2;

            // Check if mouse is within circular radius of the control position
            const distance = Math.sqrt(
              Math.pow(e.clientX - controlX, 2) + Math.pow(e.clientY - controlY, 2)
            );

            if (distance < GAP_DETECTION_THRESHOLD) {
              setGapHoverInfo({
                show: true,
                x: controlX,
                y: controlY,
                direction: "vertical",
                currentGap: currentGapPx,
                childIndex: i,
                gapRect: {
                  x: gapStart,
                  y: minTop,
                  width: Math.max(1, gapSize), // Minimum 1px for visibility
                  height: maxBottom - minTop,
                },
              });
              return;
            }
          } else if (isColumn) {
            // Vertical gaps (between rows in column layout)
            // Handle both normal and reverse direction
            const isReverse = flexDirection === "column-reverse";
            const topChild = isReverse ? child2 : child1;
            const bottomChild = isReverse ? child1 : child2;

            const gapStart = topChild.bottom;
            const gapEnd = bottomChild.top;
            const gapCenter = (gapStart + gapEnd) / 2;
            const gapSize = Math.abs(gapEnd - gapStart);

            // Skip if this gap is way off from the expected gap value (natural spacing, not flex gap)
            // Allow some tolerance (±50%) for browser rounding
            const gapTolerance = Math.max(20, currentGapPx * 0.5);
            if (Math.abs(gapSize - currentGapPx) > gapTolerance) {
              continue;
            }

            // Get the horizontal bounds of the two children that form this gap
            const minLeft = Math.min(child1.left, child2.left);
            const maxRight = Math.max(child1.right, child2.right);

            // Calculate where the control would be positioned
            const controlX = (minLeft + maxRight) / 2;
            const controlY = gapCenter;

            // Check if mouse is within circular radius of the control position
            const distance = Math.sqrt(
              Math.pow(e.clientX - controlX, 2) + Math.pow(e.clientY - controlY, 2)
            );

            if (distance < GAP_DETECTION_THRESHOLD) {
              setGapHoverInfo({
                show: true,
                x: controlX,
                y: controlY,
                direction: "horizontal",
                currentGap: currentGapPx,
                childIndex: i,
                gapRect: {
                  x: minLeft,
                  y: gapStart,
                  width: maxRight - minLeft,
                  height: Math.max(1, gapSize), // Minimum 1px for visibility
                },
              });
              return;
            }
          }
        }

        setGapHoverInfo(null);
      });
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        setIsDragging(false);
        setDragStartPos(null);
        document.body.style.cursor = "auto";

        // Force cleanup of any lingering state
        setGapHoverInfo(null);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mouseup", handleMouseUp); // Backup listener

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mouseup", handleMouseUp); // Cleanup backup listener
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [dom, isSelected, view, classDark, setProp]);

  // Cleanup effect to ensure gap control is hidden when component unmounts or node is deselected
  useEffect(() => {
    if (!isSelected) {
      setGapHoverInfo(null);
      setIsDragging(false);
      setDragStartPos(null);
      document.body.style.cursor = "auto";
    }
  }, [isSelected]);

  // Cleanup effect on unmount
  useEffect(() => {
    return () => {
      setGapHoverInfo(null);
      setIsDragging(false);
      setDragStartPos(null);
      document.body.style.cursor = "auto";
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!gapHoverInfo) return;

    const styles = window.getComputedStyle(dom);
    const currentGapPx = parseFloat(styles.gap) || 0;

    document.body.style.cursor = "move";
    setIsDragging(true);
    setDragStartPos({
      x: e.clientX,
      y: e.clientY,
      initialGap: currentGapPx,
      childIndex: gapHoverInfo.childIndex, // Lock to the gap we're hovering
    });
  };

  const shouldShow = (gapHoverInfo?.show || isDragging) && gapHoverInfo;

  const container = document?.querySelector('[data-container="true"]');
  if (!container) return null;

  // too buggy for production
  return null;

  return ReactDOM.createPortal(
    <AnimatePresence mode="wait">
      {shouldShow && (
        <>
          {/* Gap area visualization overlay with centered button */}
          {gapHoverInfo.gapRect && (
            <motion.div
              key={`gap-overlay-${id}-${gapHoverInfo.childIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-none fixed flex items-center justify-center border border-dashed border-border bg-primary/30 text-primary-foreground"
              style={{
                left: gapHoverInfo.gapRect.x,
                top: gapHoverInfo.gapRect.y,
                width: gapHoverInfo.gapRect.width,
                height: gapHoverInfo.gapRect.height,
                zIndex: 9998,
              }}
            >
              {/* Drag button - centered via flex */}
              <Tooltip content="Drag to adjust gap" placement="right">
                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    transition: { duration: 0.2 },
                  }}
                  exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
                  whileHover={{ scale: 1.3, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 1.3 }}
                  className={`drag-control ${gapHoverInfo.direction === "horizontal" ? "h-2 w-4" : "h-4 w-2"}`}
                  style={{
                    pointerEvents: "auto",
                    color: elementColor || undefined,
                    willChange: "transform",
                    backfaceVisibility: "hidden",
                    WebkitFontSmoothing: "antialiased",
                  }}
                  onMouseDown={handleMouseDown}
                  aria-label="Drag to adjust gap"
                />
              </Tooltip>

              {/* Pixel count - positioned absolute at right edge, vertically centered */}
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.15 }}
                className="pointer-events-none absolute right-1 mt-3 select-none rounded-lg border border-border bg-background px-1.5 py-0.5 font-sans text-xs font-semibold text-primary"
                style={{ top: "50%", transform: "translateY(-50%)" }}
              >
                {isNaN(gapHoverInfo.currentGap) ? "0" : Math.round(gapHoverInfo.currentGap)}
                px
              </motion.span>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>,
    container
  );
};
