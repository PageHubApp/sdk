import React, { useCallback, useEffect, useRef, useState } from "react";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface FloatingWidgetProps {
  storageKey: string;
  defaultCorner: Corner;
  margin?: number;
  zIndex?: number;
  children: React.ReactNode;
}

const CORNERS: Corner[] = ["top-left", "top-right", "bottom-left", "bottom-right"];
const STORAGE_PREFIX = "floating-widget-";
const DRAG_THRESHOLD = 5;
// Velocity threshold (px/ms) and sample window (ms) for throw detection
const THROW_VELOCITY = 0.5;
const VELOCITY_WINDOW_MS = 80;

const getCornerPos = (corner: Corner, margin: number) => {
  const w = typeof window !== "undefined" ? window.innerWidth : 1920;
  const h = typeof window !== "undefined" ? window.innerHeight : 1080;
  switch (corner) {
    case "top-left":
      return { x: margin, y: margin };
    case "top-right":
      return { x: w - margin - 56, y: margin };
    case "bottom-left":
      return { x: margin, y: h - margin - 56 };
    case "bottom-right":
      return { x: w - margin - 56, y: h - margin - 56 };
  }
};

const getCornerFromSwipe = (dx: number, dy: number, current: Corner): Corner => {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const goRight = dx > 0;
  const goDown = dy > 0;

  if (absDx > absDy * 2) {
    const isTop = current.startsWith("top");
    return isTop ? (goRight ? "top-right" : "top-left") : (goRight ? "bottom-right" : "bottom-left");
  }
  if (absDy > absDx * 2) {
    const isLeft = current.endsWith("left");
    return isLeft ? (goDown ? "bottom-left" : "top-left") : (goDown ? "bottom-right" : "top-right");
  }
  if (goRight && goDown) return "bottom-right";
  if (goRight && !goDown) return "top-right";
  if (!goRight && goDown) return "bottom-left";
  return "top-left";
};

type SavedPos = { x: number; y: number; corner?: Corner };

const setTransform = (el: HTMLDivElement, x: number, y: number) => {
  el.style.transform = `translate(${x}px, ${y}px)`;
};

const snapTransform = (el: HTMLDivElement, x: number, y: number) => {
  el.style.transition = "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
  el.style.transform = `translate(${x}px, ${y}px)`;
  setTimeout(() => { el.style.transition = ""; }, 400);
};

export function FloatingWidget({
  storageKey,
  defaultCorner,
  margin = 24,
  zIndex = 9999,
  children,
}: FloatingWidgetProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const didDragRef = useRef(false);
  const posRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cornerRef = useRef<Corner | null>(null);
  const [mounted, setMounted] = useState(false);

  // Mutable ref bag so document-level listeners always see fresh values
  // without needing to re-attach on every render.
  const stableRef = useRef({ defaultCorner, margin, save: null as any });
  stableRef.current.defaultCorner = defaultCorner;
  stableRef.current.margin = margin;

  const dragState = useRef<{
    active: boolean;
    didDrag: boolean;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    // Rolling sample buffer for reliable velocity detection
    samples: { x: number; y: number; t: number }[];
  } | null>(null);

  const save = useCallback(
    (pos: SavedPos) => {
      try {
        localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(pos));
      } catch {}
    },
    [storageKey]
  );
  stableRef.current.save = save;

  // Load saved position or compute from default corner
  useEffect(() => {
    let pos: { x: number; y: number };
    let savedCorner: Corner | null = null;

    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "object" && typeof parsed.x === "number") {
          // If it had a corner, recalculate from corner for the current window size
          if (parsed.corner && CORNERS.includes(parsed.corner)) {
            savedCorner = parsed.corner;
            pos = getCornerPos(savedCorner, margin);
          } else {
            pos = { x: parsed.x, y: parsed.y };
          }
        } else if (typeof parsed === "string" && CORNERS.includes(parsed as Corner)) {
          // Migrate old corner-only format
          savedCorner = parsed as Corner;
          pos = getCornerPos(savedCorner, margin);
        } else {
          pos = getCornerPos(defaultCorner, margin);
        }
      } else {
        pos = getCornerPos(defaultCorner, margin);
      }
    } catch {
      pos = getCornerPos(defaultCorner, margin);
    }

    // Clamp to viewport
    if (typeof window !== "undefined") {
      pos.x = Math.max(0, Math.min(window.innerWidth - 56, pos.x));
      pos.y = Math.max(0, Math.min(window.innerHeight - 56, pos.y));
    }

    posRef.current = pos;
    cornerRef.current = savedCorner || defaultCorner;
    if (elRef.current) setTransform(elRef.current, pos.x, pos.y);
    setMounted(true);
  }, [storageKey, defaultCorner, margin]);

  // ── Document-level pointer listeners ──────────────────────────
  // Attached once on mount to `document` so the drag NEVER disconnects
  // even when the mouse moves faster than the element can follow.
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const ds = dragState.current;
      if (!ds?.active) return;

      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;

      if (!ds.didDrag && Math.abs(dx) + Math.abs(dy) > DRAG_THRESHOLD) {
        ds.didDrag = true;
        didDragRef.current = true;
      }

      if (!ds.didDrag) return;

      const el = elRef.current;
      if (!el) return;

      const x = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, e.clientX - ds.offsetX));
      const y = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, e.clientY - ds.offsetY));

      posRef.current = { x, y };

      // Direct DOM — no re-renders during drag
      setTransform(el, x, y);
      el.style.cursor = "grabbing";

      // Keep a rolling window of samples for velocity calculation
      const now = Date.now();
      ds.samples.push({ x: e.clientX, y: e.clientY, t: now });
      while (ds.samples.length > 1 && now - ds.samples[0].t > VELOCITY_WINDOW_MS) {
        ds.samples.shift();
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const ds = dragState.current;
      if (!ds?.active) return;

      const { defaultCorner, margin, save } = stableRef.current;
      const el = elRef.current;
      if (el) el.style.cursor = "";

      if (ds.didDrag) {
        // Velocity from oldest sample still in the window → release point
        const oldest = ds.samples[0];
        const windowMs = Math.max(1, Date.now() - oldest.t);
        const windowDx = e.clientX - oldest.x;
        const windowDy = e.clientY - oldest.y;
        const velocity = Math.sqrt(windowDx * windowDx + windowDy * windowDy) / windowMs;

        if (velocity > THROW_VELOCITY) {
          // Fast throw — snap to corner based on throw direction
          const newCorner = getCornerFromSwipe(windowDx, windowDy, cornerRef.current || defaultCorner);
          const target = getCornerPos(newCorner, margin);
          cornerRef.current = newCorner;
          posRef.current = target;
          if (el) snapTransform(el, target.x, target.y);
          save({ ...target, corner: newCorner });
        } else {
          // Slow drag — stay where released
          const pos = posRef.current;
          cornerRef.current = null;
          if (el) setTransform(el, pos.x, pos.y);
          save(pos);
        }
      }

      dragState.current = null;
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, []); // Attached once — uses refs for all mutable data

  // ── Window resize: keep corner-snapped widgets glued to their corner ──
  useEffect(() => {
    const handleResize = () => {
      // Only reposition if we're snapped to a corner
      if (!cornerRef.current) return;
      // Don't reposition during a drag
      if (dragState.current?.active) return;

      const target = getCornerPos(cornerRef.current, stableRef.current.margin);
      posRef.current = target;
      if (elRef.current) setTransform(elRef.current, target.x, target.y);
      stableRef.current.save({ ...target, corner: cornerRef.current });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Pointer down handler (stays on the element via React) ────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("input, textarea")) return;

    didDragRef.current = false;

    dragState.current = {
      active: true,
      didDrag: false,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - posRef.current.x,
      offsetY: e.clientY - posRef.current.y,
      samples: [{ x: e.clientX, y: e.clientY, t: Date.now() }],
    };
  }, []);

  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (didDragRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  if (!mounted) return null;

  return (
    <div
      ref={elRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex,
        cursor: "grab",
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onClickCapture={handleClickCapture}
    >
      {children}
    </div>
  );
}
