import { useEffect, useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { twMerge } from "tailwind-merge";
import { buildVariantPrefix } from "../../../utils/tailwind/className";
import { isEdgeResizeActive, subscribeEdgeResize } from "../state/edgeResizeState";
import { OVERLAY_Z_CANVAS_CONTROLS } from "../../popovers/overlayZIndex";

// ── Tailwind spacing snap ───────────────────────────────────────────────

const TAILWIND_SPACING_MAP: Record<number, string> = {
  0: "0",
  1: "px",
  2: "0.5",
  4: "1",
  6: "1.5",
  8: "2",
  10: "2.5",
  12: "3",
  14: "3.5",
  16: "4",
  20: "5",
  24: "6",
  28: "7",
  32: "8",
  36: "9",
  40: "10",
  44: "11",
  48: "12",
  56: "14",
  64: "16",
  80: "20",
  96: "24",
  112: "28",
  128: "32",
  144: "36",
  160: "40",
  176: "44",
  192: "48",
  208: "52",
  224: "56",
  240: "60",
  256: "64",
  288: "72",
  320: "80",
  384: "96",
};
const SPACING_VALUES = Object.keys(TAILWIND_SPACING_MAP).map(Number);

function snapToSpacing(px: number): number {
  const val = Math.max(0, px);
  if (val > 404) return val;
  let closest = 0,
    minDiff = val;
  for (const v of SPACING_VALUES) {
    const d = Math.abs(val - v);
    if (d < minDiff) {
      minDiff = d;
      closest = v;
    }
  }
  return closest;
}

function paddingClass(side: Side, px: number): string {
  const label = TAILWIND_SPACING_MAP[px];
  const prop = `p${side[0]}`;
  return label != null ? `${prop}-${label}` : `${prop}-[${px}px]`;
}

// ── Width snap (fractions + Tailwind widths) ────────────────────────────

const WIDTH_FRACTIONS = [
  { cls: "w-1/4", ratio: 0.25 },
  { cls: "w-1/3", ratio: 1 / 3 },
  { cls: "w-1/2", ratio: 0.5 },
  { cls: "w-2/3", ratio: 2 / 3 },
  { cls: "w-3/4", ratio: 0.75 },
  { cls: "w-full", ratio: 1 },
];

function snapWidth(px: number, parentWidth: number): { cls: string; px: number } {
  if (parentWidth <= 0) return { cls: `w-[${Math.round(px)}px]`, px };
  const ratio = px / parentWidth;
  let best = WIDTH_FRACTIONS[0];
  let minDiff = Math.abs(ratio - best.ratio);
  for (const f of WIDTH_FRACTIONS) {
    const d = Math.abs(ratio - f.ratio);
    if (d < minDiff) {
      minDiff = d;
      best = f;
    }
  }
  return { cls: best.cls, px: Math.round(best.ratio * parentWidth) };
}

function snapHeight(px: number): { cls: string; px: number } {
  // Snap to common Tailwind heights
  const snapped = snapToSpacing(px);
  const label = TAILWIND_SPACING_MAP[snapped];
  if (label != null) return { cls: `h-${label}`, px: snapped };
  return { cls: `h-[${Math.round(px)}px]`, px: Math.round(px) };
}

// ── Types ───────────────────────────────────────────────────────────────

type Side = "top" | "bottom" | "left" | "right";
type DragMode = "padding" | "resize";

interface DragState {
  side: Side;
  mode: DragMode;
  startPos: number;
  initial: number;
  parentSize?: number; // for width fraction snapping
}

interface PaddingOverlayProps {
  targetElement: HTMLElement | null;
  isActive: boolean;
  setProp: (cb: (prop: any) => void, throttle?: number) => void;
  classPrefixView: string;
  classDark: boolean;
}

// ── Detection: is mouse inside (padding) or outside (resize) the container? ──

const RESIZE_ZONE = 8; // px outside the container edge for resize detection

function detectZone(
  el: HTMLElement,
  clientX: number,
  clientY: number
): { side: Side; mode: DragMode } | null {
  const rect = el.getBoundingClientRect();
  const s = window.getComputedStyle(el);
  const pt = parseFloat(s.paddingTop) || 0;
  const pr = parseFloat(s.paddingRight) || 0;
  const pb = parseFloat(s.paddingBottom) || 0;
  const pl = parseFloat(s.paddingLeft) || 0;

  // Outside edges = resize (only right and bottom — left/top are often off-screen or behind sidebar)
  if (clientY > rect.bottom && clientY <= rect.bottom + RESIZE_ZONE) {
    if (clientX >= rect.left && clientX <= rect.right) return { side: "bottom", mode: "resize" };
  }
  if (clientX > rect.right && clientX <= rect.right + RESIZE_ZONE) {
    if (clientY >= rect.top && clientY <= rect.bottom) return { side: "right", mode: "resize" };
  }

  // Inside padding zones — only if the edge is actually visible in the viewport
  if (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  ) {
    const fromTop = clientY - rect.top;
    const fromBottom = rect.bottom - clientY;
    const fromLeft = clientX - rect.left;
    const fromRight = rect.right - clientX;

    const BORDER_TRIGGER = 12;

    const viewport = document.getElementById("viewport");
    const vpLeft = viewport?.getBoundingClientRect().left ?? 0;

    // Only trigger near the container's outer border, not the whole padding zone
    if (fromTop < BORDER_TRIGGER && pt > 0) return { side: "top", mode: "padding" };
    if (fromBottom < BORDER_TRIGGER && pb > 0) return { side: "bottom", mode: "padding" };
    if (fromLeft < BORDER_TRIGGER && pl > 0) return { side: "left", mode: "padding" };
    if (fromRight < BORDER_TRIGGER && pr > 0) return { side: "right", mode: "padding" };
    // Zero padding — still allow trigger at outer edge
    if (fromTop < BORDER_TRIGGER && pt === 0) return { side: "top", mode: "padding" };
    if (fromBottom < BORDER_TRIGGER && pb === 0) return { side: "bottom", mode: "padding" };
    if (fromLeft < BORDER_TRIGGER && pl === 0) return { side: "left", mode: "padding" };
    if (fromRight < BORDER_TRIGGER && pr === 0) return { side: "right", mode: "padding" };
  }

  return null;
}

// ── Component ───────────────────────────────────────────────────────────

export function PaddingOverlay({
  targetElement,
  isActive,
  setProp,
  classPrefixView,
  classDark,
}: PaddingOverlayProps) {
  const [zone, setZone] = useState<{ side: Side; mode: DragMode } | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const [overlayRect, setOverlayRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const dragValueRef = useRef<number | null>(null);
  const draggingRef = useRef(dragging);
  draggingRef.current = dragging;
  dragValueRef.current = dragValue;

  // Track mouse to detect zone — requires 300ms dwell before showing.
  // Suppressed while BorderResizeController owns the cursor (edge band hover or
  // active resize drag) to avoid the two systems fighting over the same zone.
  const zoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingZoneRef = useRef<string | null>(null);
  const [edgeResize, setEdgeResize] = useState(isEdgeResizeActive());
  useEffect(() => subscribeEdgeResize(setEdgeResize), []);

  useEffect(() => {
    if (!targetElement || !isActive || dragging || edgeResize) return;
    const onMove = (e: MouseEvent) => {
      // Re-check inside the listener too — flag may flip mid-hover.
      if (isEdgeResizeActive()) {
        if (zoneTimerRef.current) clearTimeout(zoneTimerRef.current);
        pendingZoneRef.current = null;
        setZone(null);
        return;
      }
      const next = detectZone(targetElement, e.clientX, e.clientY);
      const key = next ? `${next.side}:${next.mode}` : null;
      if (key !== pendingZoneRef.current) {
        pendingZoneRef.current = key;
        if (zoneTimerRef.current) clearTimeout(zoneTimerRef.current);
        if (!next) {
          setZone(null);
          return;
        }
        zoneTimerRef.current = setTimeout(() => setZone(next), 400);
      }
    };
    document.addEventListener("mousemove", onMove);
    return () => {
      document.removeEventListener("mousemove", onMove);
      if (zoneTimerRef.current) clearTimeout(zoneTimerRef.current);
      pendingZoneRef.current = null;
    };
  }, [targetElement, isActive, dragging, edgeResize]);

  // Compute overlay rect for current zone
  const computeOverlay = useCallback(() => {
    if (!targetElement) return null;
    const rect = targetElement.getBoundingClientRect();
    const s = window.getComputedStyle(targetElement);
    const z = draggingRef.current || zone;
    if (!z) return null;

    const pt = parseFloat(s.paddingTop) || 0;
    const pr = parseFloat(s.paddingRight) || 0;
    const pb = parseFloat(s.paddingBottom) || 0;
    const pl = parseFloat(s.paddingLeft) || 0;

    if (z.mode === "padding") {
      switch (z.side) {
        case "top":
          return { x: rect.left, y: rect.top, w: rect.width, h: Math.max(pt, 6) };
        case "bottom":
          return {
            x: rect.left,
            y: rect.bottom - Math.max(pb, 6),
            w: rect.width,
            h: Math.max(pb, 6),
          };
        case "left":
          return { x: rect.left, y: rect.top, w: Math.max(pl, 6), h: rect.height };
        case "right":
          return {
            x: rect.right - Math.max(pr, 6),
            y: rect.top,
            w: Math.max(pr, 6),
            h: rect.height,
          };
      }
    } else {
      // Resize: thin strip outside the edge
      switch (z.side) {
        case "top":
          return { x: rect.left, y: rect.top - RESIZE_ZONE, w: rect.width, h: RESIZE_ZONE };
        case "bottom":
          return { x: rect.left, y: rect.bottom, w: rect.width, h: RESIZE_ZONE };
        case "left":
          return { x: rect.left - RESIZE_ZONE, y: rect.top, w: RESIZE_ZONE, h: rect.height };
        case "right":
          return { x: rect.right, y: rect.top, w: RESIZE_ZONE, h: rect.height };
      }
    }
  }, [targetElement, zone]);

  // Update overlay rect
  useEffect(() => {
    if (!targetElement || !isActive) {
      setOverlayRect(null);
      return;
    }
    const update = () => {
      if (!draggingRef.current) setOverlayRect(computeOverlay());
    };
    update();
    const id = setInterval(update, 200);
    return () => clearInterval(id);
  }, [targetElement, isActive, computeOverlay]);

  // Drag
  useEffect(() => {
    if (!dragging || !targetElement) return;

    const isVert = dragging.side === "top" || dragging.side === "bottom";

    const onMove = (e: MouseEvent) => {
      const pos = isVert ? e.clientY : e.clientX;
      const delta = pos - dragging.startPos;

      if (dragging.mode === "padding") {
        // top/left: drag inward (down/right) = increase; bottom/right: reversed
        const sign = dragging.side === "bottom" || dragging.side === "right" ? -1 : 1;
        const snapped = snapToSpacing(dragging.initial + delta * sign);
        setDragValue(snapped);
        const cssProp =
          `padding${dragging.side.charAt(0).toUpperCase() + dragging.side.slice(1)}` as any;
        targetElement.style[cssProp] = `${snapped}px`;
      } else {
        // Resize: right/bottom = increase with positive delta, left/top = decrease
        const sign = dragging.side === "left" || dragging.side === "top" ? -1 : 1;
        const newSize = Math.max(0, dragging.initial + delta * sign);
        if (isVert) {
          const snapped = snapHeight(newSize);
          setDragValue(snapped.px);
          targetElement.style.height = `${snapped.px}px`;
        } else {
          const parentW = dragging.parentSize || targetElement.parentElement?.offsetWidth || 0;
          const snapped = snapWidth(newSize, parentW);
          setDragValue(snapped.px);
          targetElement.style.width = `${snapped.px}px`;
        }
      }

      // Update overlay to follow
      setOverlayRect(computeOverlay());
    };

    const onUp = () => {
      const finalValue = dragValueRef.current;

      if (dragging.mode === "padding") {
        const cssProp =
          `padding${dragging.side.charAt(0).toUpperCase() + dragging.side.slice(1)}` as any;
        targetElement.style[cssProp] = "";
        if (finalValue != null) {
          const cls = paddingClass(dragging.side, finalValue);
          const prefix = buildVariantPrefix(classPrefixView, classDark);
          setProp(prop => {
            prop.className = twMerge(prop.className || "", prefix + cls);
          });
        }
      } else {
        const isVert = dragging.side === "top" || dragging.side === "bottom";
        if (isVert) {
          targetElement.style.height = "";
          if (finalValue != null) {
            const snapped = snapHeight(finalValue);
            const prefix = buildVariantPrefix(classPrefixView, classDark);
            setProp(prop => {
              prop.className = twMerge(prop.className || "", prefix + snapped.cls);
            });
          }
        } else {
          targetElement.style.width = "";
          if (finalValue != null) {
            const parentW = dragging.parentSize || targetElement.parentElement?.offsetWidth || 0;
            const snapped = snapWidth(finalValue, parentW);
            const prefix = buildVariantPrefix(classPrefixView, classDark);
            setProp(prop => {
              prop.className = twMerge(prop.className || "", prefix + snapped.cls);
            });
          }
        }
      }

      setDragging(null);
      setDragValue(null);
      document.body.style.cursor = "";
      requestAnimationFrame(() => setOverlayRect(computeOverlay()));
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragging, targetElement, setProp, classPrefixView, classDark, computeOverlay]);

  // Render
  const portalTarget = typeof document !== "undefined" ? document.getElementById("viewport") : null;
  const active = dragging || zone;
  if (!portalTarget || !active || !overlayRect) return null;

  const portalRect = portalTarget.getBoundingClientRect();
  // #viewport sits inside a CSS-zoom wrapper. getBoundingClientRect returns visual
  // pixels, but `position: absolute` inside the zoomed parent expects logical
  // pixels — they differ by the zoom factor. Compensate so overlays line up.
  const zoomVal =
    parseFloat(getComputedStyle(portalTarget.parentElement || portalTarget).zoom) || 1;
  const ox = -portalRect.left;
  const oy = -portalRect.top;

  const currentMode = dragging?.mode || zone?.mode;
  const currentSide = dragging?.side || zone?.side;
  const isVert = currentSide === "top" || currentSide === "bottom";
  const cursor = isVert ? "ns-resize" : "ew-resize";

  const isPadding = currentMode === "padding";
  const bgColor = isPadding
    ? dragging
      ? "rgba(147, 196, 125, 0.5)"
      : "rgba(147, 196, 125, 0.3)"
    : dragging
      ? "rgba(59, 130, 246, 0.4)"
      : "rgba(59, 130, 246, 0.2)";
  const labelColor = isPadding ? "#15803d" : "#1d4ed8";

  let label = "";
  if (dragging && dragValue != null) {
    label = `${Math.round(dragValue)}px`;
  } else if (zone && targetElement) {
    const s = window.getComputedStyle(targetElement);
    if (isPadding) {
      const vals = {
        top: s.paddingTop,
        bottom: s.paddingBottom,
        left: s.paddingLeft,
        right: s.paddingRight,
      };
      label = `${Math.round(parseFloat(vals[zone.side]) || 0)}px`;
    } else {
      label = isVert
        ? `${Math.round(targetElement.offsetHeight)}px`
        : `${Math.round(targetElement.offsetWidth)}px`;
    }
  }

  return ReactDOM.createPortal(
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      data-node-control="true"
      onMouseDown={e => {
        if (!targetElement || !zone) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = targetElement.getBoundingClientRect();
        const s = window.getComputedStyle(targetElement);
        let initial: number;
        let parentSize: number | undefined;

        if (zone.mode === "padding") {
          const vals = {
            top: s.paddingTop,
            bottom: s.paddingBottom,
            left: s.paddingLeft,
            right: s.paddingRight,
          };
          initial = parseFloat(vals[zone.side]) || 0;
        } else {
          initial = isVert ? rect.height : rect.width;
          if (!isVert) parentSize = targetElement.parentElement?.offsetWidth || 0;
        }

        setDragging({
          side: zone.side,
          mode: zone.mode,
          startPos: isVert ? e.clientY : e.clientX,
          initial,
          parentSize,
        });
        document.body.style.cursor = cursor;
      }}
      style={{
        position: "absolute",
        left: (overlayRect.x + ox) / zoomVal + portalTarget.scrollLeft,
        top: (overlayRect.y + oy) / zoomVal + portalTarget.scrollTop,
        width: overlayRect.w / zoomVal,
        height: overlayRect.h / zoomVal,
        backgroundColor: bgColor,
        cursor,
        zIndex: OVERLAY_Z_CANVAS_CONTROLS,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: dragging ? "none" : "all 0.15s ease",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: labelColor,
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          padding: "1px 5px",
          borderRadius: 3,
          fontFamily: "system-ui, -apple-system, sans-serif",
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>,
    portalTarget
  );
}
