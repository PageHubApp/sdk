import { useEditor } from "@craftjs/core";
import React from "react";
import { TbGripVertical } from "react-icons/tb";
import {
  CANVAS_SLOT_W,
  CanvasPos,
  getComponentCanvasPos,
} from "../../utils/componentCanvas";
import { useSetAtomState } from "../../utils/atoms";
import { OpenComponentEditorAtom, ViewModeAtom } from "../../utils/lib";
import { phStorage } from "../../utils/phStorage";

interface Props {
  containerId: string;
  index: number;
}

const HANDLE_HEIGHT = 24;
const HANDLE_GAP = 8;
const SURFACE_SELECTOR = "[data-canvas-zoom-component-canvas]";

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
export function ComponentCanvasItem({ containerId, index }: Props) {
  const { query, actions } = useEditor();
  const setViewMode = useSetAtomState(ViewModeAtom);
  const setOpenComponentEditor = useSetAtomState(OpenComponentEditorAtom);

  const savedPos = getComponentCanvasPos(containerId, query, index);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const slotRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{
    startCanvas: CanvasPos;
    startScreenX: number;
    startScreenY: number;
  } | null>(null);
  const livePosRef = React.useRef<CanvasPos>(savedPos);
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
  React.useLayoutEffect(() => {
    let cancelled = false;
    let tries = 0;
    let observer: ResizeObserver | null = null;
    let rafId = 0;

    const apply = () => {
      if (cancelled || !slotRef.current) return;
      const src = document.querySelector<HTMLElement>(
        `[node-id="${containerId}"][data-component-container="true"]`
      );
      if (!src) {
        if (tries++ < 60) requestAnimationFrame(apply);
        return;
      }
      const surface = wrapperRef.current?.closest(SURFACE_SELECTOR) as HTMLElement | null;
      const zoomNow = surface
        ? parseFloat(getComputedStyle(surface).getPropertyValue("--ph-zoom")) || 1
        : 1;
      const slotR = slotRef.current.getBoundingClientRect();
      src.style.setProperty("position", "fixed", "important");
      src.style.setProperty("left", `${slotR.left}px`, "important");
      src.style.setProperty("top", `${slotR.top}px`, "important");
      src.style.setProperty("width", `${CANVAS_SLOT_W}px`, "important");
      src.style.setProperty("transform", `scale(${zoomNow})`, "important");
      src.style.setProperty("transform-origin", "0 0", "important");
      src.style.setProperty("z-index", "40", "important");

      // Slot height matches the component's natural (pre-scale) height so
      // canvas items don't overlap visually.
      const naturalH = src.offsetHeight;
      if (naturalH > 0 && slotRef.current) {
        slotRef.current.style.height = `${naturalH}px`;
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

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      observer?.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      surface?.removeEventListener("ph-canvas-tick", apply);
      const src = document.querySelector<HTMLElement>(
        `[node-id="${containerId}"][data-component-container="true"]`
      );
      if (src) {
        ["position", "left", "top", "width", "z-index"].forEach((p) =>
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

  const onDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    phStorage.set("component-mode-origin", "canvas");
    setOpenComponentEditor({
      componentId: containerId,
      componentName: displayName,
    });
    setViewMode("component");
  };

  // Wrapper transform pulls pan/zoom from CSS vars on the surface and the
  // item's own position from --ph-item-x/y on this element. The whole
  // calculation runs in CSS — React doesn't know about pan or zoom.
  return (
    <div
      ref={wrapperRef}
      className="pointer-events-none absolute"
      style={
        {
          left: 0,
          top: 0,
          width: CANVAS_SLOT_W,
          willChange: "transform",
          transformOrigin: "0 0",
          "--ph-item-x": `${savedPos.x}px`,
          "--ph-item-y": `${savedPos.y}px`,
          transform:
            "translate3d(" +
            "calc(var(--ph-pan-x, 0px) + var(--ph-item-x, 0px) * var(--ph-zoom, 1))," +
            "calc(var(--ph-pan-y, 0px) + var(--ph-item-y, 0px) * var(--ph-zoom, 1))," +
            "0) scale(var(--ph-zoom, 1))",
        } as React.CSSProperties
      }
    >
      <div
        className="text-base-content/60 hover:text-base-content pointer-events-auto inline-flex w-fit cursor-move items-center gap-1 px-1 text-xs font-medium select-none"
        style={{ height: HANDLE_HEIGHT, marginTop: -(HANDLE_HEIGHT + HANDLE_GAP) }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        title="Drag to move · Double-click to focus"
      >
        <TbGripVertical className="size-3.5 shrink-0 opacity-60" />
        <span className="truncate">{displayName}</span>
      </div>
      <div
        ref={slotRef}
        className="rounded-b-lg"
        style={{ minHeight: 60, pointerEvents: "none" }}
      />
    </div>
  );
}
