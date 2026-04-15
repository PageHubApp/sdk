import { useEffect, useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { twMerge } from "tailwind-merge";
import { buildVariantPrefix } from "../../utils/tailwind/className";

const TAILWIND_SPACING_MAP: Record<number, string> = {
  0: "0", 1: "px", 2: "0.5", 4: "1", 6: "1.5", 8: "2", 10: "2.5",
  12: "3", 14: "3.5", 16: "4", 20: "5", 24: "6", 28: "7", 32: "8",
  36: "9", 40: "10", 44: "11", 48: "12", 56: "14", 64: "16", 80: "20",
  96: "24", 112: "28", 128: "32", 144: "36", 160: "40", 176: "44",
  192: "48", 208: "52", 224: "56", 240: "60", 256: "64", 288: "72",
  320: "80", 384: "96",
};

const SPACING_VALUES = Object.keys(TAILWIND_SPACING_MAP).map(Number);

function snapToSpacing(px: number): number {
  const abs = Math.abs(px);
  if (abs > 404) return px;
  let closest = 0;
  let minDiff = abs;
  for (const v of SPACING_VALUES) {
    const diff = Math.abs(abs - v);
    if (diff < minDiff) { minDiff = diff; closest = v; }
  }
  return px < 0 ? 0 : closest;
}

function toClass(side: string, px: number): string {
  const label = TAILWIND_SPACING_MAP[px];
  const prop = `p${side[0]}`;
  return label != null ? `${prop}-${label}` : `${prop}-[${px}px]`;
}

type Side = "top" | "bottom" | "left" | "right";
const ALL_SIDES: Side[] = ["top", "bottom", "left", "right"];
const EDGE_ZONE = 40; // px from edge to detect which side the mouse is near

interface PaddingOverlayProps {
  targetElement: HTMLElement | null;
  isActive: boolean;
  setProp: (cb: (prop: any) => void, throttle?: number) => void;
  classPrefixView: string;
  classDark: boolean;
}

interface PadInfo {
  side: Side;
  value: number;
  // Rect for the draggable edge (thin strip at inner edge of padding)
  edgeX: number;
  edgeY: number;
  edgeW: number;
  edgeH: number;
  // Rect for the full padding zone (visual highlight)
  zoneX: number;
  zoneY: number;
  zoneW: number;
  zoneH: number;
}

function computePadInfo(el: HTMLElement): PadInfo[] {
  const rect = el.getBoundingClientRect();
  const s = window.getComputedStyle(el);
  const pt = parseFloat(s.paddingTop) || 0;
  const pr = parseFloat(s.paddingRight) || 0;
  const pb = parseFloat(s.paddingBottom) || 0;
  const pl = parseFloat(s.paddingLeft) || 0;

  return [
    {
      side: "top", value: pt,
      zoneX: rect.left, zoneY: rect.top, zoneW: rect.width, zoneH: Math.max(pt, 6),
      edgeX: rect.left, edgeY: rect.top + pt - 3, edgeW: rect.width, edgeH: 6,
    },
    {
      side: "bottom", value: pb,
      zoneX: rect.left, zoneY: rect.bottom - Math.max(pb, 6), zoneW: rect.width, zoneH: Math.max(pb, 6),
      edgeX: rect.left, edgeY: rect.bottom - pb - 3, edgeW: rect.width, edgeH: 6,
    },
    {
      side: "left", value: pl,
      zoneX: rect.left, zoneY: rect.top, zoneW: Math.max(pl, 6), zoneH: rect.height,
      edgeX: rect.left + pl - 3, edgeY: rect.top, edgeW: 6, edgeH: rect.height,
    },
    {
      side: "right", value: pr,
      zoneX: rect.right - Math.max(pr, 6), zoneY: rect.top, zoneW: Math.max(pr, 6), zoneH: rect.height,
      edgeX: rect.right - pr - 3, edgeY: rect.top, edgeW: 6, edgeH: rect.height,
    },
  ];
}

function nearestSide(el: HTMLElement, clientX: number, clientY: number): Side | null {
  const rect = el.getBoundingClientRect();
  const fromTop = clientY - rect.top;
  const fromBottom = rect.bottom - clientY;
  const fromLeft = clientX - rect.left;
  const fromRight = rect.right - clientX;

  const min = Math.min(fromTop, fromBottom, fromLeft, fromRight);
  if (min > EDGE_ZONE) return null;
  if (min === fromTop) return "top";
  if (min === fromBottom) return "bottom";
  if (min === fromLeft) return "left";
  return "right";
}

export function PaddingOverlay({ targetElement, isActive, setProp, classPrefixView, classDark }: PaddingOverlayProps) {
  const [padInfo, setPadInfo] = useState<PadInfo[]>([]);
  const [nearSide, setNearSide] = useState<Side | null>(null);
  const [dragging, setDragging] = useState<{ side: Side; startPos: number; initial: number } | null>(null);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const dragValueRef = useRef<number | null>(null);
  const draggingRef = useRef(dragging);
  draggingRef.current = dragging;
  dragValueRef.current = dragValue;

  const refreshRects = useCallback(() => {
    if (targetElement) setPadInfo(computePadInfo(targetElement));
  }, [targetElement]);

  // Update rects periodically
  useEffect(() => {
    if (!targetElement || !isActive) { setPadInfo([]); return; }

    refreshRects();
    const id = setInterval(() => {
      if (!draggingRef.current) refreshRects();
    }, 200);
    const viewport = document.getElementById("viewport");
    const onScroll = () => { if (!draggingRef.current) refreshRects(); };
    if (viewport) viewport.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);

    return () => {
      clearInterval(id);
      if (viewport) viewport.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [targetElement, isActive, refreshRects]);

  // Track mouse position to detect nearest side
  useEffect(() => {
    if (!targetElement || !isActive || dragging) return;

    const onMove = (e: MouseEvent) => {
      setNearSide(nearestSide(targetElement, e.clientX, e.clientY));
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, [targetElement, isActive, dragging]);

  // Drag
  useEffect(() => {
    if (!dragging || !targetElement) return;

    const isVertical = dragging.side === "top" || dragging.side === "bottom";
    // Drag inner edge AWAY from outer edge = increase padding
    // top: drag down = increase, bottom: drag up = increase
    // left: drag right = increase, right: drag left = increase
    const isReverse = dragging.side === "bottom" || dragging.side === "right";

    const onMove = (e: MouseEvent) => {
      const pos = isVertical ? e.clientY : e.clientX;
      const delta = (pos - dragging.startPos) * (isReverse ? -1 : 1);
      const snapped = snapToSpacing(Math.max(0, dragging.initial + delta));
      setDragValue(snapped);

      const cssProp = `padding${dragging.side.charAt(0).toUpperCase() + dragging.side.slice(1)}` as any;
      targetElement.style[cssProp] = `${snapped}px`;

      // Update rects live so the overlay follows
      setPadInfo(computePadInfo(targetElement));
    };

    const onUp = () => {
      const cssProp = `padding${dragging.side.charAt(0).toUpperCase() + dragging.side.slice(1)}` as any;
      targetElement.style[cssProp] = "";

      const finalValue = dragValueRef.current;
      if (finalValue != null) {
        const cls = toClass(dragging.side, finalValue);
        const prefix = buildVariantPrefix(classPrefixView, classDark);
        setProp(prop => {
          prop.className = twMerge(prop.className || "", prefix + cls);
        });
      }

      setDragging(null);
      setDragValue(null);
      document.body.style.cursor = "";

      // Refresh after CraftJS applies
      requestAnimationFrame(() => refreshRects());
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragging, targetElement, setProp, classPrefixView, classDark, refreshRects]);

  const portalTarget = typeof document !== "undefined" ? document.getElementById("viewport") : null;
  if (!portalTarget || padInfo.length === 0) return null;

  const portalRect = portalTarget.getBoundingClientRect();
  const ox = -portalRect.left + portalTarget.scrollLeft;
  const oy = -portalRect.top + portalTarget.scrollTop;

  return ReactDOM.createPortal(
    <>
      {padInfo.map(p => {
        const isDraggingSide = dragging?.side === p.side;
        const isNearSide = nearSide === p.side;
        const active = isDraggingSide || isNearSide;
        const isVert = p.side === "top" || p.side === "bottom";
        const cursor = isVert ? "ns-resize" : "ew-resize";
        const displayValue = isDraggingSide && dragValue != null ? dragValue : p.value;
        const isZero = p.value === 0 && !isDraggingSide;

        return (
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions
          <div
            key={p.side}
            data-node-control="true"
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
              setDragging({
                side: p.side,
                startPos: isVert ? e.clientY : e.clientX,
                initial: p.value,
              });
              document.body.style.cursor = cursor;
            }}
            style={{
              position: "absolute",
              left: p.zoneX + ox,
              top: p.zoneY + oy,
              width: p.zoneW,
              height: p.zoneH,
              backgroundColor: active
                ? isDraggingSide
                  ? "rgba(147, 196, 125, 0.5)"
                  : "rgba(147, 196, 125, 0.3)"
                : "transparent",
              cursor: active ? cursor : "default",
              zIndex: 9998,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: isDraggingSide ? "none" : "all 0.15s ease",
              pointerEvents: active ? "auto" : "none",
              // At zero padding, show a thin colored line so user knows they can drag
              ...(isZero && isNearSide ? {
                backgroundColor: "rgba(147, 196, 125, 0.6)",
                pointerEvents: "auto" as const,
              } : {}),
            }}
          >
            {active && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#15803d",
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  padding: "1px 5px",
                  borderRadius: 3,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  pointerEvents: "none",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {Math.round(displayValue)}px
              </span>
            )}
          </div>
        );
      })}
    </>,
    portalTarget
  );
}
