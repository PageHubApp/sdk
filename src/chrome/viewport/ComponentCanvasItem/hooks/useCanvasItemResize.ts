import React from "react";
import {
  CANVAS_MIN_H,
  CANVAS_MIN_W,
  CANVAS_SLOT_W,
  CanvasSize,
} from "../../../../utils/component/componentCanvas";
import { CARD_PAD, ResizeSide } from "../constants";

interface Args {
  containerId: string;
  actions: any;
  slotRef: React.RefObject<HTMLDivElement | null>;
  innerRef: React.RefObject<HTMLDivElement | null>;
  liveSizeRef: React.RefObject<CanvasSize>;
  applyPinRef: React.RefObject<() => void>;
  readZoom: () => number;
}

/** Resize handlers — same window-listener pattern as drag. */
export function useCanvasItemResize({
  containerId,
  actions,
  slotRef,
  innerRef,
  liveSizeRef,
  applyPinRef,
  readZoom,
}: Args) {
  const resizeRef = React.useRef<{
    side: ResizeSide;
    startScreenX: number;
    startScreenY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const moveListenerRef = React.useRef<((e: PointerEvent) => void) | null>(null);
  const endListenerRef = React.useRef<((e: PointerEvent) => void) | null>(null);
  const blurListenerRef = React.useRef<(() => void) | null>(null);

  const detachListeners = React.useCallback(() => {
    if (moveListenerRef.current) {
      window.removeEventListener("pointermove", moveListenerRef.current);
      moveListenerRef.current = null;
    }
    if (endListenerRef.current) {
      window.removeEventListener("pointerup", endListenerRef.current);
      window.removeEventListener("pointercancel", endListenerRef.current);
      endListenerRef.current = null;
    }
    if (blurListenerRef.current) {
      window.removeEventListener("blur", blurListenerRef.current);
      blurListenerRef.current = null;
    }
  }, []);

  const finishResize = React.useCallback(() => {
    detachListeners();
    document.body.style.cursor = "";
    const r = resizeRef.current;
    if (!r) return;
    const final = liveSizeRef.current;
    const wroteWidth = r.side !== "bottom";
    const wroteHeight = r.side !== "right";
    resizeRef.current = null;
    try {
      actions.setProp(containerId, (p: any) => {
        if (!p.custom) p.custom = {};
        const prev = p.custom.canvasSize || {};
        const next: CanvasSize = {};
        if (wroteWidth && final.w !== undefined) {
          next.w = Math.round(final.w);
        } else if (typeof prev.w === "number") {
          next.w = prev.w;
        }
        if (wroteHeight && final.h !== undefined) {
          next.h = Math.round(final.h);
        } else if (typeof prev.h === "number") {
          next.h = prev.h;
        }
        p.custom.canvasSize = next;
      });
    } catch (err) {
      console.error("[ComponentCanvasItem] failed to commit size", err);
    }
  }, [actions, containerId, detachListeners, liveSizeRef]);

  const onResizePointerDown = React.useCallback(
    (side: ResizeSide) => (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      detachListeners();
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // ignore — window listeners cover this
      }
      // Start from the currently displayed sizes, not the saved ones — this
      // matters in auto-fit mode where neither dim has a committed value yet.
      // Read the slot's actual rendered size and convert back to canvas units
      // (slot is inside the scaled inner wrapper, so offsetWidth/Height are
      // pre-scale canvas coords already).
      const slotEl = slotRef.current;
      const startW =
        liveSizeRef.current.w !== undefined
          ? liveSizeRef.current.w
          : slotEl
            ? Math.max(CANVAS_MIN_W, slotEl.offsetWidth - CARD_PAD * 2)
            : CANVAS_SLOT_W;
      const startH =
        liveSizeRef.current.h !== undefined
          ? liveSizeRef.current.h
          : slotEl
            ? slotEl.offsetHeight
            : CANVAS_MIN_H;
      resizeRef.current = {
        side,
        startScreenX: e.clientX,
        startScreenY: e.clientY,
        startW,
        startH,
      };
      document.body.style.cursor =
        side === "right" ? "ew-resize" : side === "bottom" ? "ns-resize" : "nwse-resize";

      const onMove = (ev: PointerEvent) => {
        const r = resizeRef.current;
        if (!r) return;
        if (ev.buttons === 0) {
          finishResize();
          return;
        }
        const zoomNow = readZoom();
        const dx = (ev.clientX - r.startScreenX) / zoomNow;
        const dy = (ev.clientY - r.startScreenY) / zoomNow;
        let nextW = liveSizeRef.current.w;
        let nextH = liveSizeRef.current.h;
        if (r.side === "right" || r.side === "corner") {
          nextW = Math.max(CANVAS_MIN_W, r.startW + dx);
        }
        if (r.side === "bottom" || r.side === "corner") {
          nextH = Math.max(CANVAS_MIN_H, r.startH + dy);
        }
        liveSizeRef.current = { w: nextW, h: nextH };
        if (innerRef.current && nextW !== undefined) {
          innerRef.current.style.width = `${nextW + CARD_PAD * 2}px`;
        }
        // applyPinRef writes the live component's width + slot height from
        // liveSizeRef and re-pins position in one frame.
        applyPinRef.current?.();
      };
      const onEnd = (_ev: PointerEvent) => {
        finishResize();
      };
      const onBlur = () => {
        finishResize();
      };

      moveListenerRef.current = onMove;
      endListenerRef.current = onEnd;
      blurListenerRef.current = onBlur;
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
      window.addEventListener("blur", onBlur);
    },
    [applyPinRef, detachListeners, finishResize, innerRef, liveSizeRef, readZoom, slotRef]
  );

  // Unmount safety + reset cursor.
  React.useEffect(() => {
    return () => {
      detachListeners();
      document.body.style.cursor = "";
    };
  }, [detachListeners]);

  return { onResizePointerDown, resizeRef };
}
