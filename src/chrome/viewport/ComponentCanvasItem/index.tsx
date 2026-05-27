import { useEditor } from "@craftjs/core";
import React from "react";
import { TbFocus2, TbGripVertical } from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { useRegistries } from "../../../registry";
import {
  CANVAS_SLOT_W,
  CanvasPos,
  CanvasPosKey,
  CanvasSize,
  getComponentCanvasPos,
  getComponentCanvasSize,
} from "../../../utils/component/componentCanvas";
import {
  CARD_PAD,
  HANDLE_GAP,
  HANDLE_HEIGHT,
  RESIZE_BAND,
  SURFACE_SELECTOR,
} from "./constants";
import { useCanvasItemDrag } from "./hooks/useCanvasItemDrag";
import { useCanvasItemResize } from "./hooks/useCanvasItemResize";
import { useLiveDomPin } from "./hooks/useLiveDomPin";
import { useStateCardPin } from "./hooks/useStateCardPin";

interface Props {
  containerId: string;
  index: number;
  /** When true, the wrapper renders without its drag handle (the user is
      focused on this single component). The position-pinning effect still
      runs so the component stays at its slot. */
  isolated?: boolean;
  /** Used in canvas isolation when the master is shown alongside state cards.
      Overrides the 4-col auto-layout default. The auto-write effect commits
      this value (not the auto-layout fallback) when the node has no saved
      canvasPos yet, so the state card persists at its first-displayed spot. */
  defaultPos?: CanvasPos;
  /** Hide the focus button + noop double-click. Required for state cards —
      isolating a non-`type === "component"` node would trip the safety
      effect in ComponentCanvasViewport and immediately exit isolation. */
  disableIsolate?: boolean;
  /** Tag the live DOM with `data-canvas-state-pin="true"` while this card is
      mounted. Pairs with the body-scoped CSS rule that overrides Tailwind
      `hidden` so the state subtree renders with a real bbox to pin. */
  isStatePin?: boolean;
  /** Picks which `props.custom` key persists this card's position. List view
      uses `canvasPos`; isolation view uses `canvasIsolatePos` so dragging in
      one canvas doesn't shift the layout of the other. Defaults to list. */
  isIsolationCanvas?: boolean;
}

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
export function ComponentCanvasItem({
  containerId,
  index,
  isolated = false,
  defaultPos,
  disableIsolate = false,
  isStatePin = false,
  isIsolationCanvas = false,
}: Props) {
  const { query, actions } = useEditor();
  const { commands } = useRegistries();

  const posKey: CanvasPosKey = isIsolationCanvas ? "canvasIsolatePos" : "canvasPos";

  // Saved pos comes from props.custom[posKey]; if none, prefer caller-
  // supplied defaultPos (state cards) before the auto-layout fallback.
  const storedPos = (() => {
    try {
      const p = query.node(containerId).get()?.data?.props?.custom?.[posKey];
      if (p && typeof p.x === "number" && typeof p.y === "number") {
        return { x: p.x, y: p.y } as CanvasPos;
      }
    } catch {
      // ignore
    }
    return null;
  })();
  const savedPos: CanvasPos =
    storedPos ?? defaultPos ?? getComponentCanvasPos(containerId, query, index, posKey);
  const savedSize = getComponentCanvasSize(containerId, query);

  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const slotRef = React.useRef<HTMLDivElement>(null);
  // Inner wrapper holds the scaled slot. Width lives here (in canvas units).
  // Outer wrapper only translates so the drag handle stays at 1:1 (sharp).
  const innerRef = React.useRef<HTMLDivElement>(null);
  const livePosRef = React.useRef<CanvasPos>(savedPos);
  // Live size mirrors livePos: pointermove writes refs + DOM directly, only
  // pointerup commits to props. h === undefined keeps slot in auto-fit mode.
  const liveSizeRef = React.useRef<CanvasSize>(savedSize);
  const applyPinRef = React.useRef<() => void>(() => {});

  const readZoom = React.useCallback(() => {
    const surface = wrapperRef.current?.closest(SURFACE_SELECTOR) as HTMLElement | null;
    if (!surface) return 1;
    return parseFloat(getComputedStyle(surface).getPropertyValue("--ph-zoom")) || 1;
  }, []);

  const { onPointerDown, dragRef } = useCanvasItemDrag({
    containerId,
    posKey,
    actions,
    wrapperRef,
    livePosRef,
    applyPinRef,
    readZoom,
  });

  const { onResizePointerDown, resizeRef } = useCanvasItemResize({
    containerId,
    actions,
    slotRef,
    innerRef,
    liveSizeRef,
    applyPinRef,
    readZoom,
  });

  // Persist auto-layout position back to props on first mount, so subsequent
  // reads (and the Container's stored position) line up with the drag handle.
  React.useEffect(() => {
    try {
      const node = query.node(containerId).get();
      const stored = node?.data?.props?.custom?.[posKey];
      if (!stored || typeof stored.x !== "number" || typeof stored.y !== "number") {
        actions.setProp(containerId, (p: any) => {
          if (!p.custom) p.custom = {};
          p.custom[posKey] = savedPos;
        });
      }
    } catch {
      // ignore
    }
  }, [containerId, posKey]);

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
    // Provisional width — apply() will refine via auto-fit if liveW unset.
    if (innerRef.current) {
      innerRef.current.style.width = `${(savedSize.w ?? CANVAS_SLOT_W) + CARD_PAD * 2}px`;
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

  // Pin hooks LAST so the live-DOM pin layoutEffect runs after the local
  // sync layoutEffects above — preserves original mount-time effect order
  // (the sync effects' `applyPinRef.current()` calls remain no-ops on first
  // mount; the pin effect's own initial `apply()` is the only call).
  useStateCardPin(containerId, isStatePin);
  useLiveDomPin({
    containerId,
    isStatePin,
    wrapperRef,
    slotRef,
    innerRef,
    liveSizeRef,
    applyPinRef,
  });

  const displayName = (() => {
    try {
      const node = query.node(containerId).get();
      return (
        node?.data?.custom?.displayName ||
        node?.data?.props?.custom?.displayName ||
        node?.data?.displayName ||
        "Component"
      );
    } catch {
      return "Component";
    }
  })();

  const onIsolate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disableIsolate) return;
    void commands.execute(
      "ph.node.isolate",
      { id: containerId },
      { trigger: "menu" }
    );
  };

  // Double-click on the drag handle is a gesture (not a button click) — we
  // dispatch the same command to keep the action body in one place, but
  // could revert to inline if drag-handle UX ever diverges from isolate.
  const onDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disableIsolate) return;
    void commands.execute(
      "ph.node.isolate",
      { id: containerId },
      { trigger: "menu" }
    );
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
      data-ph-canvas-card="true"
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
            onDoubleClick={onDoubleClick}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content={
              disableIsolate ? "Drag to move" : "Drag to move · Double-click to isolate"
            }
            data-tooltip-place="bottom"
            data-tooltip-offset={10}
          >
            <TbGripVertical className="size-3.5 shrink-0 opacity-60" />
            <span className="truncate">{displayName}</span>
          </div>
          {!disableIsolate && (
            <button
              type="button"
              onClick={onIsolate}
              className="hover:text-base-content ml-1 flex size-5 cursor-pointer items-center justify-center rounded opacity-70 hover:opacity-100"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Isolate this component"
              data-tooltip-place="bottom"
              data-tooltip-offset={10}
              aria-label={`Isolate ${displayName}`}
            >
              <TbFocus2 className="size-3.5" />
            </button>
          )}
        </div>
      )}
      <div
        ref={innerRef}
        style={{
          width: (savedSize.w ?? CANVAS_SLOT_W) + CARD_PAD * 2,
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
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content="Drag to resize width"
                data-tooltip-place="left"
                data-tooltip-offset={6}
              />
              {/* Bottom edge — height resize. */}
              <div
                onPointerDown={onResizePointerDown("bottom")}
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
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content="Drag to resize height"
                data-tooltip-place="top"
                data-tooltip-offset={6}
              />
              {/* Bottom-right corner — both at once. Higher z-index so it wins
                over the right/bottom bands in the overlap. */}
              <div
                onPointerDown={onResizePointerDown("corner")}
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
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content="Drag to resize"
                data-tooltip-place="top-end"
                data-tooltip-offset={6}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
