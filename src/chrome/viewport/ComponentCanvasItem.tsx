import { useEditor } from "@craftjs/core";
import React from "react";
import { TbFocus2, TbGripVertical } from "react-icons/tb";
import {
  CANVAS_MIN_H,
  CANVAS_MIN_W,
  CanvasPos,
  CanvasSize,
  getComponentCanvasPos,
  getComponentCanvasSize,
} from "../../utils/componentCanvas";
import { useSetAtomState } from "../../utils/atoms";
import { CanvasIsolateAtom } from "../../utils/componentIsolation";
import {
  getLiveComponent,
  subscribeLive,
} from "../../utils/componentRegistry";

interface Props {
  containerId: string;
  index: number;
  /** When true, the wrapper renders without its drag handle (the user is
      focused on this single component). The position-pinning effect still
      runs so the component stays at its slot. */
  isolated?: boolean;
}

const HANDLE_HEIGHT = 24;
const HANDLE_GAP = 8;
const CARD_PAD = 12;
const SURFACE_SELECTOR = "[data-canvas-zoom-component-canvas]";
const RESIZE_BAND = 8;

type ResizeSide = "right" | "bottom" | "corner";

/**
 * Canvas slot for a single component.
 *
 * Pan + zoom are read from CSS variables on the surface (`--ph-pan-x`,
 * `--ph-pan-y`, `--ph-zoom`) via a calc-based transform on the wrapper.
 * Pan/zoom changes therefore do NOT re-render this component — the wrapper
 * just reads the new var value via CSS. The viewport dispatches a
 * `ph-canvas-tick` event on the surface whenever pan/zoom changes; we listen
 * for it to re-pin the live component DOM (which is `position: fixed` and
 * needs its left/top updated imperatively).
 *
 * Drag is also React-bypassed: pointermove writes the wrapper's `--ph-item-x`
 * / `--ph-item-y` directly via ref + re-pins the live DOM. We only call
 * `actions.setProp` on pointerup. So a 60Hz drag is 60 DOM mutations and ZERO
 * React renders.
 */
export function ComponentCanvasItem({ containerId, index, isolated = false }: Props) {
  const { query, actions } = useEditor();
  const setCanvasIsolate = useSetAtomState(CanvasIsolateAtom);

  const savedPos = getComponentCanvasPos(containerId, query, index);
  const savedSize = getComponentCanvasSize(containerId, query);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const slotRef = React.useRef<HTMLDivElement>(null);
  // Inner wrapper holds the scaled slot. Width lives here (in canvas units).
  // Outer wrapper only translates so the drag handle stays at 1:1 (sharp).
  const innerRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{
    startCanvas: CanvasPos;
    startScreenX: number;
    startScreenY: number;
  } | null>(null);
  const livePosRef = React.useRef<CanvasPos>(savedPos);
  // Live size mirrors livePos: pointermove writes refs + DOM directly, only
  // pointerup commits to props. h === undefined keeps slot in auto-fit mode.
  const liveSizeRef = React.useRef<CanvasSize>(savedSize);
  const resizeRef = React.useRef<{
    side: ResizeSide;
    startScreenX: number;
    startScreenY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const moveRafRef = React.useRef<number>(0);
  const pendingPosRef = React.useRef<CanvasPos | null>(null);
  const applyPinRef = React.useRef<() => void>(() => {});

  // Persist auto-layout position back to props on first mount, so subsequent
  // reads (and the Container's stored position) line up with the drag handle.
  React.useEffect(() => {
    try {
      const node = query.node(containerId).get();
      const stored = node?.data?.props?.custom?.canvasPos;
      if (!stored || typeof stored.x !== "number" || typeof stored.y !== "number") {
        actions.setProp(containerId, (p: any) => {
          if (!p.custom) p.custom = {};
          p.custom.canvasPos = savedPos;
        });
      }
    } catch {
      // ignore
    }
  }, [containerId]);

  // When savedPos changes externally (and we're not dragging), sync the CSS vars.
  React.useLayoutEffect(() => {
    if (dragRef.current) return;
    livePosRef.current = savedPos;
    const w = wrapperRef.current;
    if (!w) return;
    w.style.setProperty("--ph-item-x", `${savedPos.x}px`);
    w.style.setProperty("--ph-item-y", `${savedPos.y}px`);
    applyPinRef.current();
  }, [savedPos.x, savedPos.y]);

  // Same idea for size — keep liveSizeRef + wrapper width in sync with the
  // committed value when we're not in the middle of a resize.
  React.useLayoutEffect(() => {
    if (resizeRef.current) return;
    liveSizeRef.current = { w: savedSize.w, h: savedSize.h };
    if (innerRef.current) {
      innerRef.current.style.width = `${savedSize.w + CARD_PAD * 2}px`;
    }
    applyPinRef.current();
  }, [savedSize.w, savedSize.h]);

  // When `isolated` toggles, the drag handle appears/disappears, which shifts
  // the slot's screen Y by the handle height. ResizeObserver doesn't fire on
  // position-only changes, so we need to re-pin manually. Two rAFs: one for the
  // current frame's layout, one for the next frame in case other layout passes
  // (e.g. pan-to-center setting new pan) haven't committed yet.
  React.useLayoutEffect(() => {
    applyPinRef.current();
    requestAnimationFrame(() => applyPinRef.current());
  }, [isolated]);

  // Cancel any pending rAF on unmount
  React.useEffect(() => {
    return () => {
      if (moveRafRef.current) {
        cancelAnimationFrame(moveRafRef.current);
        moveRafRef.current = 0;
      }
    };
  }, []);

  // Pin the live CraftJS-rendered DOM to our slot via position: fixed in
  // screen coords. The element stays in its React-managed parent so
  // reconciliation isn't broken; we just override its visual position.
  //
  // Re-runs on:
  //  - mount + containerId change
  //  - ph-canvas-tick from the surface (pan/zoom changed)
  //  - ResizeObserver on slot (slot height changed)
  //  - scroll/resize (slot screen position shifted)
  //  - savedPos change (item layout-effect calls applyPinRef.current())
  //  - pointermove (drag handler calls applyPinRef.current())
  //  - registry change (Container mounts/unmounts the live element)
  React.useLayoutEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let rafId = 0;

    const apply = () => {
      if (cancelled || !slotRef.current) return;
      // Read live DOM from the registry instead of querySelector — Container
      // registers itself on mount/unmount, so this reflects React's actual
      // committed state without the race-on-reconciliation that querySelector
      // had. When the registry has nothing, we hide the slot chrome and wait
      // for the subscriber to fire when Container remounts. No retry cap.
      const src = getLiveComponent(containerId);
      if (!src) {
        slotRef.current.style.opacity = "0";
        return;
      }
      slotRef.current.style.opacity = "1";
      const surface = wrapperRef.current?.closest(SURFACE_SELECTOR) as HTMLElement | null;
      const zoomNow = surface
        ? parseFloat(getComputedStyle(surface).getPropertyValue("--ph-zoom")) || 1
        : 1;
      const slotR = slotRef.current.getBoundingClientRect();
      // Pin the live component INSIDE the slot's padding, so the slot's chrome
      // (border/rounded/shadow) frames it like a card. The padding is in canvas
      // coords (pre-zoom) so the offset scales with zoom.
      const padScaled = CARD_PAD * zoomNow;
      const liveW = liveSizeRef.current.w;
      const liveH = liveSizeRef.current.h;
      src.style.setProperty("position", "fixed", "important");
      src.style.setProperty("left", `${slotR.left + padScaled}px`, "important");
      src.style.setProperty("top", `${slotR.top + padScaled}px`, "important");
      src.style.setProperty("width", `${liveW}px`, "important");
      src.style.setProperty("transform", `scale(${zoomNow})`, "important");
      src.style.setProperty("transform-origin", "0 0", "important");
      src.style.setProperty("z-index", "40", "important");

      // Slot height: when liveH is set the user has explicitly sized the card
      // (bottom-edge drag), otherwise auto-fit to the live component's natural
      // rendered height + padding on both sides.
      if (liveH !== undefined) {
        slotRef.current.style.height = `${liveH}px`;
      } else {
        const naturalH = src.offsetHeight;
        if (naturalH > 0) {
          slotRef.current.style.height = `${naturalH + CARD_PAD * 2}px`;
        }
      }
    };

    const schedule = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(apply);
    };

    applyPinRef.current = apply;
    apply();
    observer = new ResizeObserver(schedule);
    if (slotRef.current) observer.observe(slotRef.current);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);

    const surface = wrapperRef.current?.closest(SURFACE_SELECTOR) as HTMLElement | null;
    surface?.addEventListener("ph-canvas-tick", apply);

    // Re-pin whenever the registry's entry for this container changes
    // (Container mounted/unmounted). Replaces the old polling loop.
    const unsubRegistry = subscribeLive(containerId, schedule);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      observer?.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      surface?.removeEventListener("ph-canvas-tick", apply);
      unsubRegistry();
      const src = getLiveComponent(containerId);
      if (src) {
        ["position", "left", "top", "width", "transform", "transform-origin", "z-index"].forEach((p) =>
          src.style.removeProperty(p)
        );
      }
    };
  }, [containerId]);

  const displayName = (() => {
    try {
      const node = query.node(containerId).get();
      return node?.data?.custom?.displayName || node?.data?.props?.custom?.displayName || "Component";
    } catch {
      return "Component";
    }
  })();

  const readZoom = () => {
    const surface = wrapperRef.current?.closest(SURFACE_SELECTOR) as HTMLElement | null;
    if (!surface) return 1;
    return parseFloat(getComputedStyle(surface).getPropertyValue("--ph-zoom")) || 1;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startCanvas: { ...livePosRef.current },
      startScreenX: e.clientX,
      startScreenY: e.clientY,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const zoomNow = readZoom();
    const dx = (e.clientX - dragRef.current.startScreenX) / zoomNow;
    const dy = (e.clientY - dragRef.current.startScreenY) / zoomNow;
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
      applyPinRef.current();
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (moveRafRef.current) {
      cancelAnimationFrame(moveRafRef.current);
      moveRafRef.current = 0;
    }
    const flushed = pendingPosRef.current;
    pendingPosRef.current = null;
    const finalPos = flushed ?? livePosRef.current;
    livePosRef.current = finalPos;
    if (wrapperRef.current) {
      wrapperRef.current.style.setProperty("--ph-item-x", `${finalPos.x}px`);
      wrapperRef.current.style.setProperty("--ph-item-y", `${finalPos.y}px`);
    }
    applyPinRef.current();
    try {
      actions.setProp(containerId, (p: any) => {
        if (!p.custom) p.custom = {};
        p.custom.canvasPos = finalPos;
      });
    } catch (err) {
      console.error("[ComponentCanvasItem] failed to commit pos", err);
    }
    dragRef.current = null;
  };

  const onResizePointerDown = (side: ResizeSide) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    // Start from the currently displayed sizes, not the saved ones — this
    // matters in auto-fit mode where slot height has no committed value yet.
    const startW = liveSizeRef.current.w;
    const slotEl = slotRef.current;
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
  };

  const onResizePointerMove = (e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r) return;
    const zoomNow = readZoom();
    const dx = (e.clientX - r.startScreenX) / zoomNow;
    const dy = (e.clientY - r.startScreenY) / zoomNow;
    let nextW = liveSizeRef.current.w;
    let nextH = liveSizeRef.current.h;
    if (r.side === "right" || r.side === "corner") {
      nextW = Math.max(CANVAS_MIN_W, r.startW + dx);
    }
    if (r.side === "bottom" || r.side === "corner") {
      nextH = Math.max(CANVAS_MIN_H, r.startH + dy);
    }
    liveSizeRef.current = { w: nextW, h: nextH };
    if (innerRef.current) {
      innerRef.current.style.width = `${nextW + CARD_PAD * 2}px`;
    }
    // applyPinRef writes the live component's width + slot height from
    // liveSizeRef and re-pins position in one frame.
    applyPinRef.current();
  };

  const onResizePointerUp = (e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    document.body.style.cursor = "";
    const final = liveSizeRef.current;
    const wroteHeight = r.side !== "right";
    resizeRef.current = null;
    try {
      actions.setProp(containerId, (p: any) => {
        if (!p.custom) p.custom = {};
        const prev = p.custom.canvasSize || {};
        const next: CanvasSize = { w: Math.round(final.w) };
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
  };

  const onIsolate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCanvasIsolate(containerId);
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCanvasIsolate(containerId);
  };

  // Two-wrapper structure to keep chrome (drag handle) sharp at any zoom:
  //   outer  → translate only (pan + item*zoom). No scale → handle text/icons
  //            render at 1:1 device pixels.
  //   inner  → scale(zoom). The slot card + its background pattern + the live
  //            component all scale uniformly here.
  // Without this split, the handle bar sat inside a scaled wrapper and got
  // bitmap-scaled (blurry text + icons whenever zoom != 1).
  return (
    <div
      ref={wrapperRef}
      className="pointer-events-none absolute"
      style={
        {
          left: 0,
          top: 0,
          willChange: "transform",
          "--ph-item-x": `${savedPos.x}px`,
          "--ph-item-y": `${savedPos.y}px`,
          transform:
            "translate3d(" +
            "calc(var(--ph-pan-x, 0px) + var(--ph-item-x, 0px) * var(--ph-zoom, 1))," +
            "calc(var(--ph-pan-y, 0px) + var(--ph-item-y, 0px) * var(--ph-zoom, 1))," +
            "0)",
        } as React.CSSProperties
      }
    >
      {!isolated && (
        <div
          className="text-base-content/60 pointer-events-auto absolute inline-flex w-fit items-center gap-1 px-1 text-xs font-medium select-none"
          style={{
            height: HANDLE_HEIGHT,
            top: -(HANDLE_HEIGHT + HANDLE_GAP),
            left: 0,
          }}
        >
          <div
            className="hover:text-base-content flex cursor-move items-center gap-1"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onDoubleClick={onDoubleClick}
            title="Drag to move · Double-click to isolate"
          >
            <TbGripVertical className="size-3.5 shrink-0 opacity-60" />
            <span className="truncate">{displayName}</span>
          </div>
          <button
            type="button"
            onClick={onIsolate}
            className="hover:text-base-content ml-1 flex size-5 cursor-pointer items-center justify-center rounded opacity-70 hover:opacity-100"
            title="Isolate this component"
            aria-label={`Isolate ${displayName}`}
          >
            <TbFocus2 className="size-3.5" />
          </button>
        </div>
      )}
      <div
        ref={innerRef}
        style={{
          width: savedSize.w + CARD_PAD * 2,
          transform: "scale(var(--ph-zoom, 1))",
          transformOrigin: "0 0",
        }}
      >
      <div
        ref={slotRef}
        className="border-base-300 rounded-lg border bg-white bg-[radial-gradient(#bfdbfe_1px,transparent_1px)] bg-size-[20px_20px] transition-opacity duration-150 dark:bg-[#0a0a0a] dark:bg-[radial-gradient(#3b82f680_1px,transparent_1px)]"
        style={{
          minHeight: 60 + CARD_PAD * 2,
          pointerEvents: "none",
          opacity: 0,
          position: "relative",
        }}
      >
        {!isolated && (
          <>
            {/* Right edge — width resize. Sits half-outside the slot so the
                cursor flips just before the visible border. */}
            <div
              onPointerDown={onResizePointerDown("right")}
              onPointerMove={onResizePointerMove}
              onPointerUp={onResizePointerUp}
              onPointerCancel={onResizePointerUp}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                right: -RESIZE_BAND / 2,
                width: RESIZE_BAND,
                cursor: "ew-resize",
                pointerEvents: "auto",
                zIndex: 1,
              }}
              title="Drag to resize width"
            />
            {/* Bottom edge — height resize. */}
            <div
              onPointerDown={onResizePointerDown("bottom")}
              onPointerMove={onResizePointerMove}
              onPointerUp={onResizePointerUp}
              onPointerCancel={onResizePointerUp}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: -RESIZE_BAND / 2,
                height: RESIZE_BAND,
                cursor: "ns-resize",
                pointerEvents: "auto",
                zIndex: 1,
              }}
              title="Drag to resize height"
            />
            {/* Bottom-right corner — both at once. Higher z-index so it wins
                over the right/bottom bands in the overlap. */}
            <div
              onPointerDown={onResizePointerDown("corner")}
              onPointerMove={onResizePointerMove}
              onPointerUp={onResizePointerUp}
              onPointerCancel={onResizePointerUp}
              style={{
                position: "absolute",
                right: -RESIZE_BAND,
                bottom: -RESIZE_BAND,
                width: RESIZE_BAND * 2,
                height: RESIZE_BAND * 2,
                cursor: "nwse-resize",
                pointerEvents: "auto",
                zIndex: 2,
              }}
              title="Drag to resize"
            />
          </>
        )}
      </div>
      </div>
    </div>
  );
}
