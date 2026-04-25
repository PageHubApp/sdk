/**
 * Hook encapsulating all gap-drag interaction logic:
 *  - Mouse move / hover detection over gap areas
 *  - Drag state management (start, move, end)
 *  - Snapping to Tailwind gap scale and applying via setProp
 *
 * Extracted from GapDragControl.tsx.
 */
import React, { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { buildVariantPrefix, removeClassForView } from "../../../utils/tailwind/className";
import { GAP_CLASS_TO_PX, pixelsToGapClass } from "./gapScale";

const GAP_DETECTION_THRESHOLD = 40; // px — circular radius around the gap control

export interface GapHoverInfo {
  show: boolean;
  x: number;
  y: number;
  direction: "horizontal" | "vertical";
  currentGap: number;
  childIndex: number;
  gapRect?: { x: number; y: number; width: number; height: number };
}

interface UseGapDragOptions {
  dom: HTMLElement | null;
  isSelected: boolean;
  classPrefixView: string;
  classDark: boolean;
  setProp: (cb: (prop: any) => void, throttle?: number) => void;
}

/** Filter DOM children to those that are visible layout children (not node controls, etc.). */
function getVisibleChildren(parent: HTMLElement): HTMLElement[] {
  return (Array.from(parent.children) as HTMLElement[]).filter(el => {
    if (el.hasAttribute?.("data-node-control")) return false;
    if (el.hasAttribute?.("data-exclude-gap-detection")) return false;
    return el.offsetParent !== null || el.tagName === "BODY";
  });
}

/**
 * Pure computation: given a flex container, return one GapHoverInfo per gap
 * between adjacent visible children. Used by GapDragControl to render passive
 * "always-visible" markers when the container is selected.
 *
 * Returns [] if the element isn't a flex container, has fewer than 2 children,
 * or has no measurable gap.
 */
export function computeAllGapRects(dom: HTMLElement | null): GapHoverInfo[] {
  if (!dom) return [];
  const styles = window.getComputedStyle(dom);
  const display = styles.display;
  if (display !== "flex" && display !== "inline-flex") return [];

  const children = getVisibleChildren(dom);
  if (children.length < 2) return [];

  const gapValue = styles.gap;
  let currentGapPx = 0;
  if (gapValue && gapValue !== "normal" && gapValue !== "0px") {
    const parsed = parseFloat(gapValue);
    if (!isNaN(parsed)) currentGapPx = parsed;
  }
  if (currentGapPx < 1) return [];

  const flexDirection = styles.flexDirection;
  const isRow = flexDirection === "row" || flexDirection === "row-reverse";
  const isColumn = flexDirection === "column" || flexDirection === "column-reverse";
  const out: GapHoverInfo[] = [];

  for (let i = 0; i < children.length - 1; i++) {
    const c1 = children[i].getBoundingClientRect();
    const c2 = children[i + 1].getBoundingClientRect();

    if (isRow) {
      const isReverse = flexDirection === "row-reverse";
      const left = isReverse ? c2 : c1;
      const right = isReverse ? c1 : c2;
      const gapStart = left.right;
      const gapEnd = right.left;
      const gapSize = Math.max(1, gapEnd - gapStart);
      const minTop = Math.min(c1.top, c2.top);
      const maxBottom = Math.max(c1.bottom, c2.bottom);
      out.push({
        show: true,
        x: (gapStart + gapEnd) / 2,
        y: (minTop + maxBottom) / 2,
        direction: "vertical",
        currentGap: currentGapPx,
        childIndex: i,
        gapRect: { x: gapStart, y: minTop, width: gapSize, height: maxBottom - minTop },
      });
    } else if (isColumn) {
      const isReverse = flexDirection === "column-reverse";
      const top = isReverse ? c2 : c1;
      const bottom = isReverse ? c1 : c2;
      const gapStart = top.bottom;
      const gapEnd = bottom.top;
      const gapSize = Math.max(1, gapEnd - gapStart);
      const minLeft = Math.min(c1.left, c2.left);
      const maxRight = Math.max(c1.right, c2.right);
      out.push({
        show: true,
        x: (minLeft + maxRight) / 2,
        y: (gapStart + gapEnd) / 2,
        direction: "horizontal",
        currentGap: currentGapPx,
        childIndex: i,
        gapRect: { x: minLeft, y: gapStart, width: maxRight - minLeft, height: gapSize },
      });
    }
  }

  return out;
}

export function useGapDrag({
  dom,
  isSelected,
  classPrefixView,
  classDark,
  setProp,
}: UseGapDragOptions) {
  const [gapHoverInfo, setGapHoverInfo] = useState<GapHoverInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{
    x: number;
    y: number;
    initialGap: number;
    childIndex: number;
  } | null>(null);

  // Refs to avoid stale closures in event handlers
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef(dragStartPos);
  const gapHoverInfoRef = useRef(gapHoverInfo);
  // After mouseup, ignore hover detection until this timestamp passes — gives
  // the marker a beat to actually disappear before the cursor (still parked in
  // the gap) re-triggers it on the next mousemove.
  const suppressUntilRef = useRef(0);

  isDraggingRef.current = isDragging;
  dragStartPosRef.current = dragStartPos;
  gapHoverInfoRef.current = gapHoverInfo;

  // Main mouse-move + mouse-up effect
  useEffect(() => {
    if (!dom || !isSelected) return;

    const styles = window.getComputedStyle(dom);
    const hasFlex = styles.display === "flex" || styles.display === "inline-flex";
    if (!hasFlex) return;

    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId);

      // --- While dragging: update gap and visual position ---
      if (isDraggingRef.current && dragStartPosRef.current && gapHoverInfoRef.current) {
        const distance =
          gapHoverInfoRef.current.direction === "vertical"
            ? e.clientX - dragStartPosRef.current.x
            : e.clientY - dragStartPosRef.current.y;

        const newGapPx = Math.max(0, dragStartPosRef.current.initialGap + distance);
        document.body.style.cursor = "move";

        const gapClass = pixelsToGapClass(newGapPx);
        const snappedPx = GAP_CLASS_TO_PX[gapClass] ?? newGapPx;

        // Inline style for live feedback — setProp on drop
        dom.style.gap = `${snappedPx}px`;

        // Update control position to follow the gap center
        const children = getVisibleChildren(dom);
        const lockedIndex = dragStartPosRef.current.childIndex;

        if (children.length > lockedIndex + 1) {
          const computedStyles = window.getComputedStyle(dom);
          const flexDirection = computedStyles.flexDirection;
          const child1 = children[lockedIndex].getBoundingClientRect();
          const child2 = children[lockedIndex + 1].getBoundingClientRect();

          let newX = gapHoverInfoRef.current.x;
          let newY = gapHoverInfoRef.current.y;
          let newGapRect: GapHoverInfo["gapRect"];

          if (gapHoverInfoRef.current.direction === "vertical") {
            const isReverse = flexDirection === "row-reverse";
            const leftChild = isReverse ? child2 : child1;
            const rightChild = isReverse ? child1 : child2;
            newX = (leftChild.right + rightChild.left) / 2;
            newGapRect = {
              x: leftChild.right,
              y: Math.min(child1.top, child2.top),
              width: Math.max(1, rightChild.left - leftChild.right),
              height: Math.max(child1.bottom, child2.bottom) - Math.min(child1.top, child2.top),
            };
          } else {
            const isReverse = flexDirection === "column-reverse";
            const topChild = isReverse ? child2 : child1;
            const bottomChild = isReverse ? child1 : child2;
            newY = (topChild.bottom + bottomChild.top) / 2;
            newGapRect = {
              x: Math.min(child1.left, child2.left),
              y: topChild.bottom,
              width: Math.max(child1.right, child2.right) - Math.min(child1.left, child2.left),
              height: Math.max(1, bottomChild.top - topChild.bottom),
            };
          }

          setGapHoverInfo(prev =>
            prev ? { ...prev, x: newX, y: newY, currentGap: snappedPx, gapRect: newGapRect } : prev
          );
        }
        return;
      }

      // Don't update hover detection while dragging
      if (isDraggingRef.current) return;

      // Post-drag cool-down — keep marker hidden briefly so it doesn't snap
      // back the instant mouseup releases (cursor is still parked in the gap).
      if (Date.now() < suppressUntilRef.current) return;

      // --- Hover detection ---
      rafId = requestAnimationFrame(() => {
        const computedStyles = window.getComputedStyle(dom);
        const flexDirection = computedStyles.flexDirection;
        const isRow = flexDirection === "row" || flexDirection === "row-reverse";
        const isColumn = flexDirection === "column" || flexDirection === "column-reverse";

        const children = getVisibleChildren(dom);
        if (children.length < 2) {
          setGapHoverInfo(null);
          return;
        }

        let currentGapPx = 0;
        const gapValue = computedStyles.gap;
        if (gapValue && gapValue !== "normal" && gapValue !== "0px") {
          const parsed = parseFloat(gapValue);
          if (!isNaN(parsed)) currentGapPx = parsed;
        }

        if (currentGapPx < 1 && computedStyles.gap !== "0px") {
          setGapHoverInfo(null);
          return;
        }

        for (let i = 0; i < children.length - 1; i++) {
          const child1 = children[i].getBoundingClientRect();
          const child2 = children[i + 1].getBoundingClientRect();

          const detected = detectGapHover(
            e,
            child1,
            child2,
            flexDirection,
            isRow,
            isColumn,
            currentGapPx,
            i
          );
          if (detected) {
            // No dwell — show the marker the moment the cursor enters the gap zone.
            setGapHoverInfo(prev =>
              prev && prev.childIndex === detected.childIndex && prev.x === detected.x && prev.y === detected.y
                ? prev
                : detected,
            );
            return;
          }
        }

        setGapHoverInfo(null);
      });
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        // Clear inline style and commit to CraftJS
        dom.style.gap = "";
        const currentGap = parseFloat(window.getComputedStyle(dom).gap) || 0;
        const snappedGap = gapHoverInfoRef.current?.currentGap ?? currentGap;
        const gapClass = pixelsToGapClass(snappedGap);
        const prefix = buildVariantPrefix(classPrefixView, classDark);
        setProp(prop => {
          const withoutExistingGap = removeClassForView(
            prop.className || "",
            "gap",
            classPrefixView,
            {
              classDark,
            }
          );
          prop.className = twMerge(withoutExistingGap, prefix + gapClass);
        });

        setIsDragging(false);
        setDragStartPos(null);
        document.body.style.cursor = "auto";
        setGapHoverInfo(null);
        suppressUntilRef.current = Date.now() + 250;
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mouseup", handleMouseUp);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [dom, isSelected, classPrefixView, classDark, setProp]);

  // Reset when deselected
  useEffect(() => {
    if (!isSelected) {
      setGapHoverInfo(null);
      setIsDragging(false);
      setDragStartPos(null);
      document.body.style.cursor = "auto";
    }
  }, [isSelected]);

  // Cleanup on unmount
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
    if (!gapHoverInfo || !dom) return;

    const computedStyles = window.getComputedStyle(dom);
    const currentGapPx = parseFloat(computedStyles.gap) || 0;

    document.body.style.cursor = "move";
    setIsDragging(true);
    setDragStartPos({
      x: e.clientX,
      y: e.clientY,
      initialGap: currentGapPx,
      childIndex: gapHoverInfo.childIndex,
    });
  };

  return { gapHoverInfo, isDragging, handleMouseDown };
}

// ---------------------------------------------------------------------------
// Helper: detect whether the mouse is within the gap region between two children
// ---------------------------------------------------------------------------

function detectGapHover(
  e: MouseEvent,
  child1: DOMRect,
  child2: DOMRect,
  flexDirection: string,
  isRow: boolean,
  isColumn: boolean,
  currentGapPx: number,
  childIndex: number
): GapHoverInfo | null {
  const gapTolerance = Math.max(20, currentGapPx * 0.5);

  if (isRow) {
    const isReverse = flexDirection === "row-reverse";
    const leftChild = isReverse ? child2 : child1;
    const rightChild = isReverse ? child1 : child2;
    const gapStart = leftChild.right;
    const gapEnd = rightChild.left;
    const gapCenter = (gapStart + gapEnd) / 2;
    const gapSize = Math.abs(gapEnd - gapStart);

    if (Math.abs(gapSize - currentGapPx) > gapTolerance) return null;

    const minTop = Math.min(child1.top, child2.top);
    const maxBottom = Math.max(child1.bottom, child2.bottom);
    const controlX = gapCenter;
    const controlY = (minTop + maxBottom) / 2;
    const distance = Math.hypot(e.clientX - controlX, e.clientY - controlY);

    if (distance < GAP_DETECTION_THRESHOLD) {
      return {
        show: true,
        x: controlX,
        y: controlY,
        direction: "vertical",
        currentGap: currentGapPx,
        childIndex,
        gapRect: {
          x: gapStart,
          y: minTop,
          width: Math.max(1, gapSize),
          height: maxBottom - minTop,
        },
      };
    }
  } else if (isColumn) {
    const isReverse = flexDirection === "column-reverse";
    const topChild = isReverse ? child2 : child1;
    const bottomChild = isReverse ? child1 : child2;
    const gapStart = topChild.bottom;
    const gapEnd = bottomChild.top;
    const gapCenter = (gapStart + gapEnd) / 2;
    const gapSize = Math.abs(gapEnd - gapStart);

    if (Math.abs(gapSize - currentGapPx) > gapTolerance) return null;

    const minLeft = Math.min(child1.left, child2.left);
    const maxRight = Math.max(child1.right, child2.right);
    const controlX = (minLeft + maxRight) / 2;
    const controlY = gapCenter;
    const distance = Math.hypot(e.clientX - controlX, e.clientY - controlY);

    if (distance < GAP_DETECTION_THRESHOLD) {
      return {
        show: true,
        x: controlX,
        y: controlY,
        direction: "horizontal",
        currentGap: currentGapPx,
        childIndex,
        gapRect: {
          x: minLeft,
          y: gapStart,
          width: maxRight - minLeft,
          height: Math.max(1, gapSize),
        },
      };
    }
  }

  return null;
}
