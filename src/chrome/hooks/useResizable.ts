import { useCallback, useEffect, useRef, useState } from "react";

type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface UseResizableOptions {
  storageKey: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  /** Which edges/corners to allow resizing from. Default: ["e", "s", "se"] */
  edges?: ResizeEdge[];
}

const EDGE_CURSORS: Record<ResizeEdge, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
};

const STORAGE_PREFIX = "resizable-";
const HANDLE_SIZE = 8;
const CORNER_SIZE = 14;

/**
 * Reusable hook for drag-to-resize on any positioned element.
 *
 * Returns `width`, `height`, an `isResizing` flag, and `handleProps` — a map
 * of edge-name → event handlers + inline styles you spread onto invisible
 * hit-area `<div>`s around the element.
 *
 * For edges that would move the element origin (n, w, nw, ne, sw) the hook
 * reports cumulative position deltas via `positionDelta` so the consumer can
 * adjust `top`/`left` accordingly.
 */
export function useResizable(options: UseResizableOptions) {
  const {
    storageKey,
    defaultWidth,
    defaultHeight,
    minWidth = 200,
    minHeight = 200,
    maxWidth = 9999,
    maxHeight = 9999,
    edges = ["e", "s", "se"],
  } = options;

  const clamp = (w: number, h: number) => ({
    width: Math.max(minWidth, Math.min(maxWidth, Math.round(w))),
    height: Math.max(minHeight, Math.min(maxHeight, Math.round(h))),
  });

  const [size, setSize] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + storageKey);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.width === "number" && typeof p.height === "number") {
          return clamp(p.width, p.height);
        }
      }
    } catch {}
    return { width: defaultWidth, height: defaultHeight };
  });

  const [positionDelta, setPositionDelta] = useState({ dx: 0, dy: 0 });
  const [isResizing, setIsResizing] = useState(false);

  const sizeRef = useRef(size);
  sizeRef.current = size;
  const deltaRef = useRef(positionDelta);
  deltaRef.current = positionDelta;

  const dragRef = useRef<{
    edge: ResizeEdge;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const save = useCallback(
    (s: { width: number; height: number }) => {
      try {
        localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(s));
      } catch {}
    },
    [storageKey],
  );

  // Document-level pointer listeners — attached once
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const ds = dragRef.current;
      if (!ds) return;
      e.preventDefault();

      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;

      let w = ds.startWidth;
      let h = ds.startHeight;
      let pdx = 0;
      let pdy = 0;

      if (ds.edge.includes("e")) w = ds.startWidth + dx;
      if (ds.edge.includes("w")) {
        w = ds.startWidth - dx;
        pdx = dx;
      }
      if (ds.edge.includes("s")) h = ds.startHeight + dy;
      if (ds.edge.includes("n")) {
        h = ds.startHeight - dy;
        pdy = dy;
      }

      const clamped = clamp(w, h);

      // Correct position deltas for clamping
      if (ds.edge.includes("w")) pdx = ds.startWidth - clamped.width;
      if (ds.edge.includes("n")) pdy = ds.startHeight - clamped.height;

      sizeRef.current = clamped;
      deltaRef.current = { dx: pdx, dy: pdy };
      setSize(clamped);
      setPositionDelta({ dx: pdx, dy: pdy });
    };

    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setIsResizing(false);
      save(sizeRef.current);
      // Reset delta — consumer should have already applied it
      setPositionDelta({ dx: 0, dy: 0 });
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [minWidth, minHeight, maxWidth, maxHeight, save]);

  const startResize = useCallback(
    (edge: ResizeEdge) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        edge,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: sizeRef.current.width,
        startHeight: sizeRef.current.height,
      };
      setIsResizing(true);
      document.body.style.cursor = EDGE_CURSORS[edge];
      document.body.style.userSelect = "none";
    },
    [],
  );

  // Build per-edge style + handler objects the consumer can spread onto <div>s
  const handleStyles: Record<ResizeEdge, React.CSSProperties> = {
    n: {
      position: "absolute",
      top: -(HANDLE_SIZE / 2),
      left: CORNER_SIZE,
      right: CORNER_SIZE,
      height: HANDLE_SIZE,
      cursor: "ns-resize",
    },
    s: {
      position: "absolute",
      bottom: -(HANDLE_SIZE / 2),
      left: CORNER_SIZE,
      right: CORNER_SIZE,
      height: HANDLE_SIZE,
      cursor: "ns-resize",
    },
    e: {
      position: "absolute",
      right: -(HANDLE_SIZE / 2),
      top: CORNER_SIZE,
      bottom: CORNER_SIZE,
      width: HANDLE_SIZE,
      cursor: "ew-resize",
    },
    w: {
      position: "absolute",
      left: -(HANDLE_SIZE / 2),
      top: CORNER_SIZE,
      bottom: CORNER_SIZE,
      width: HANDLE_SIZE,
      cursor: "ew-resize",
    },
    ne: {
      position: "absolute",
      top: -(HANDLE_SIZE / 2),
      right: -(HANDLE_SIZE / 2),
      width: CORNER_SIZE,
      height: CORNER_SIZE,
      cursor: "nesw-resize",
    },
    nw: {
      position: "absolute",
      top: -(HANDLE_SIZE / 2),
      left: -(HANDLE_SIZE / 2),
      width: CORNER_SIZE,
      height: CORNER_SIZE,
      cursor: "nwse-resize",
    },
    se: {
      position: "absolute",
      bottom: -(HANDLE_SIZE / 2),
      right: -(HANDLE_SIZE / 2),
      width: CORNER_SIZE,
      height: CORNER_SIZE,
      cursor: "nwse-resize",
    },
    sw: {
      position: "absolute",
      bottom: -(HANDLE_SIZE / 2),
      left: -(HANDLE_SIZE / 2),
      width: CORNER_SIZE,
      height: CORNER_SIZE,
      cursor: "nesw-resize",
    },
  };

  const handleProps = Object.fromEntries(
    edges.map((edge) => [
      edge,
      { style: handleStyles[edge], onPointerDown: startResize(edge) },
    ]),
  ) as Record<ResizeEdge, { style: React.CSSProperties; onPointerDown: (e: React.PointerEvent) => void }>;

  return { width: size.width, height: size.height, isResizing, positionDelta, handleProps };
}
