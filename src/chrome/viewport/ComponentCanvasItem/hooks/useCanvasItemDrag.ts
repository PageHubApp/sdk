import React from "react";
import {
  CanvasPos,
  CanvasPosKey,
} from "../../../../utils/component/componentCanvas";
import { resolveOverlap } from "../utils/cardCollision";
import { sdkLog } from "../../../../utils/logger";

interface Args {
  containerId: string;
  posKey: CanvasPosKey;
  actions: any;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  livePosRef: React.RefObject<CanvasPos>;
  applyPinRef: React.RefObject<() => void>;
  readZoom: () => number;
}

/**
 * Drag handlers attach to window on pointerdown so a missed pointerup —
 * mouse released over an overlay menu, off the document, or after a
 * mid-drag re-render — can never strand the drag. setPointerCapture on the
 * handle isn't enough: capture is lost when the handle DOM re-renders or
 * when a higher-z overlay swallows the up event.
 */
export function useCanvasItemDrag({
  containerId,
  posKey,
  actions,
  wrapperRef,
  livePosRef,
  applyPinRef,
  readZoom,
}: Args) {
  const dragRef = React.useRef<{
    startCanvas: CanvasPos;
    startScreenX: number;
    startScreenY: number;
  } | null>(null);
  const pendingPosRef = React.useRef<CanvasPos | null>(null);
  const moveRafRef = React.useRef<number>(0);

  const moveListenerRef = React.useRef<((e: PointerEvent) => void) | null>(null);
  const endListenerRef = React.useRef<((e: PointerEvent) => void) | null>(null);
  const blurListenerRef = React.useRef<(() => void) | null>(null);
  const pointerIdRef = React.useRef<number | null>(null);

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
    pointerIdRef.current = null;
  }, []);

  const finishDrag = React.useCallback(() => {
    detachListeners();
    if (!dragRef.current) return;
    if (moveRafRef.current) {
      cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = 0;
    }
    const flushed = pendingPosRef.current;
    pendingPosRef.current = null;
    const rawPos = flushed ?? livePosRef.current;
    // Auto-correct: if we dropped on top of another card, slide off in the
    // direction that requires the smallest movement.
    const finalPos = wrapperRef.current ? resolveOverlap(wrapperRef.current, rawPos) : rawPos;
    livePosRef.current = finalPos;
    if (wrapperRef.current) {
      wrapperRef.current.style.setProperty("--ph-item-x", `${finalPos.x}px`);
      wrapperRef.current.style.setProperty("--ph-item-y", `${finalPos.y}px`);
    }
    applyPinRef.current?.();
    try {
      actions.setProp(containerId, (p: any) => {
        if (!p.custom) p.custom = {};
        p.custom[posKey] = finalPos;
      });
    } catch (err) {
      sdkLog.error("[ComponentCanvasItem] failed to commit pos", err);
    }
    dragRef.current = null;
  }, [actions, applyPinRef, containerId, detachListeners, livePosRef, posKey, wrapperRef]);

  const onPointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      detachListeners();
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // ignore — window listeners cover this
      }
      pointerIdRef.current = e.pointerId;
      dragRef.current = {
        startCanvas: { ...livePosRef.current },
        startScreenX: e.clientX,
        startScreenY: e.clientY,
      };

      const onMove = (ev: PointerEvent) => {
        if (!dragRef.current) return;
        // Buttons released without our up firing (mouseup over an overlay,
        // browser quirk, etc.). Treat this move as the implicit end so the
        // drag can't keep tracking the cursor.
        if (ev.buttons === 0) {
          finishDrag();
          return;
        }
        const zoomNow = readZoom();
        const dx = (ev.clientX - dragRef.current.startScreenX) / zoomNow;
        const dy = (ev.clientY - dragRef.current.startScreenY) / zoomNow;
        pendingPosRef.current = {
          x: dragRef.current.startCanvas.x + dx,
          y: dragRef.current.startCanvas.y + dy,
        };
        if (moveRafRef.current) return;
        moveRafRef.current = requestAnimationFrame(() => {
          moveRafRef.current = 0;
          const next = pendingPosRef.current;
          pendingPosRef.current = null;
          if (!next || !wrapperRef.current) return;
          livePosRef.current = next;
          wrapperRef.current.style.setProperty("--ph-item-x", `${next.x}px`);
          wrapperRef.current.style.setProperty("--ph-item-y", `${next.y}px`);
          applyPinRef.current?.();
        });
      };
      const onEnd = (_ev: PointerEvent) => {
        finishDrag();
      };
      const onBlur = () => {
        // Window lost focus mid-drag (alt-tab, devtools steal, dropdown
        // grabbed focus). Commit whatever we have and stop tracking.
        finishDrag();
      };

      moveListenerRef.current = onMove;
      endListenerRef.current = onEnd;
      blurListenerRef.current = onBlur;
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
      window.addEventListener("blur", onBlur);
    },
    [applyPinRef, detachListeners, finishDrag, livePosRef, readZoom, wrapperRef]
  );

  // Unmount safety: tear down any in-flight drag listeners + cancel rAF so
  // the window doesn't keep firing into stale closures after the card
  // disappears (entering/exiting isolation, hidden toggle, etc).
  React.useEffect(() => {
    return () => {
      detachListeners();
      if (moveRafRef.current) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = 0;
      }
    };
  }, [detachListeners]);

  return { onPointerDown, dragRef };
}
